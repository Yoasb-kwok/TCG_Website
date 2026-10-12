import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  parseRegistrationInput,
  registrationConflict,
  registrationClosedLabel,
} from "@/lib/registration-input";
import type { RegistrationInput, TournamentItem } from "@/lib/types";

export type RegistrationRecord = {
  id: string;
  slug: string;
  playerName: string;
  phone: string;
  email?: string;
  createdAt: string;
};

const filePath = path.join(process.cwd(), "data", "tournament-registrations.json");

const DB_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "P1001",
  "P1002",
  "P1017",
]);

let writeQueue: Promise<unknown> = Promise.resolve();

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function isDbConnectionError(error: unknown): boolean {
  return DB_CONNECTION_ERRORS.has(errorCode(error));
}

async function readFileRegistrations(): Promise<RegistrationRecord[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as RegistrationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function updateFileRegistrations(
  update: (records: RegistrationRecord[]) => RegistrationRecord[] | Promise<RegistrationRecord[]>,
) {
  let next: RegistrationRecord[] = [];
  const run = writeQueue.then(async () => {
    const current = await readFileRegistrations();
    next = await update(current);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  await run;
  return next;
}

function demoBySlug(slug: string) {
  return DEMO_TOURNAMENTS.find((tournament) => tournament.slug === slug) ?? null;
}

function mapDbTournament(tournament: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  format: string;
  maxPlayers: number;
  entryFee: number;
  prizePool: string | null;
  location: string;
  startsAt: Date;
  registrationDeadline: Date;
  status: string;
  _count: { registrations: number };
}): TournamentItem {
  return {
    id: tournament.id,
    title: tournament.title,
    slug: tournament.slug,
    description: tournament.description,
    format: tournament.format,
    maxPlayers: tournament.maxPlayers,
    entryFee: tournament.entryFee,
    prizePool: tournament.prizePool,
    location: tournament.location,
    startsAt: tournament.startsAt.toISOString(),
    registrationDeadline: tournament.registrationDeadline.toISOString(),
    status: tournament.status,
    registeredCount: tournament._count.registrations,
  };
}

export async function listPublicTournaments(): Promise<TournamentItem[]> {
  if (isDatabaseConfigured()) {
    try {
      const tournaments = await getPrisma().tournament.findMany({
        where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS"] } },
        include: { _count: { select: { registrations: true } } },
        orderBy: { startsAt: "asc" },
      });
      if (tournaments.length > 0) return tournaments.map(mapDbTournament);
    } catch {
      // Fall back to the local signup file.
    }
  }

  const records = await readFileRegistrations();
  return DEMO_TOURNAMENTS.map((tournament) => ({
    ...tournament,
    registeredCount: records.filter((record) => record.slug === tournament.slug).length,
  }));
}

export async function getPublicTournament(slug: string): Promise<TournamentItem | null> {
  const tournaments = await listPublicTournaments();
  return tournaments.find((tournament) => tournament.slug === slug) ?? null;
}

type RegisterResult =
  | { ok: true; registration: RegistrationRecord }
  | { ok: false; error: string; status: number };

export async function registerForTournament(
  slug: string,
  input: {
    playerName?: string | null;
    email?: string | null;
    phone?: string | null;
  },
): Promise<RegisterResult> {
  const parsed = parseRegistrationInput(input);
  if (!parsed.ok) return parsed;

  if (isDatabaseConfigured()) {
    try {
      const saved = await registerInDatabase(slug, parsed.value);
      if (saved) return saved;
    } catch (error) {
      const demo = demoBySlug(slug);
      if (!isDbConnectionError(error) || !demo) {
        if (isDbConnectionError(error)) {
          return { ok: false, error: "數據庫連接失敗，請稍後再試", status: 503 };
        }
        console.error("Registration error:", error);
        return { ok: false, error: "報名失敗，請重試", status: 500 };
      }
      // The database is configured but unreachable. Demo events still accept a local signup.
    }
  }

  const tournament = demoBySlug(slug);
  if (!tournament) return { ok: false, error: "找不到賽事", status: 404 };
  return registerInFile(tournament, parsed.value);
}

async function registerInDatabase(
  slug: string,
  input: RegistrationInput,
): Promise<RegisterResult | null> {
  const prisma = getPrisma();
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) return null;

  const publicTournament = mapDbTournament(tournament);
  const closed = registrationClosedLabel(publicTournament);
  if (closed) {
    const error =
      closed === "賽事已取消" || closed === "賽事已結束" ? "此賽事已不再接受報名" : closed;
    return { ok: false, error, status: 400 };
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Tournament" WHERE id = ${tournament.id} FOR UPDATE`;
      const existing = await tx.tournamentRegistration.findMany({
        where: { tournamentId: tournament.id },
        select: { email: true, phone: true },
      });
      const conflict = registrationConflict(existing, input, tournament.maxPlayers);
      if (conflict) return { ok: false as const, error: conflict.error, status: conflict.status };

      const created = await tx.tournamentRegistration.create({
        data: {
          tournamentId: tournament.id,
          playerName: input.playerName,
          email: input.email,
          phone: input.phone,
        },
      });
      return { ok: true as const, created };
    });

    if (!outcome.ok) return outcome;

    return {
      ok: true,
      registration: {
        id: outcome.created.id,
        slug,
        playerName: outcome.created.playerName,
        email: outcome.created.email ?? input.email,
        phone: outcome.created.phone,
        createdAt: outcome.created.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (errorCode(error) === "P2002") {
      return { ok: false, error: "此電郵或電話已報名此賽事", status: 409 };
    }
    throw error;
  }
}

async function registerInFile(
  tournament: (typeof DEMO_TOURNAMENTS)[number],
  input: RegistrationInput,
): Promise<RegisterResult> {
  if (tournament.status !== "OPEN") {
    return { ok: false, error: "此賽事已不再接受報名", status: 400 };
  }
  const deadline = new Date(tournament.registrationDeadline).getTime();
  if (Number.isNaN(deadline) || deadline <= Date.now()) {
    return { ok: false, error: "報名已截止", status: 400 };
  }

  let result: RegisterResult = { ok: false, error: "報名失敗，請重試", status: 500 };
  await updateFileRegistrations((records) => {
    const mine = records.filter((record) => record.slug === tournament.slug);
    const conflict = registrationConflict(mine, input, tournament.maxPlayers);
    if (conflict) {
      result = { ok: false, error: conflict.error, status: conflict.status };
      return records;
    }
    const registration: RegistrationRecord = {
      id: crypto.randomUUID(),
      slug: tournament.slug,
      playerName: input.playerName,
      email: input.email,
      phone: input.phone,
      createdAt: new Date().toISOString(),
    };
    result = { ok: true, registration };
    return [...records, registration];
  });
  return result;
}

export async function listRegistrationRosters() {
  if (isDatabaseConfigured()) {
    try {
      const tournaments = await getPrisma().tournament.findMany({
        where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS"] } },
        include: { registrations: { orderBy: { createdAt: "asc" } } },
        orderBy: { startsAt: "asc" },
      });
      if (tournaments.length > 0) {
        return tournaments.map((tournament) => ({
          slug: tournament.slug,
          title: tournament.title,
          registrations: tournament.registrations.map((registration) => ({
            id: registration.id,
            playerName: registration.playerName,
            email: registration.email,
            phone: registration.phone,
            createdAt: registration.createdAt.toISOString(),
          })),
        }));
      }
    } catch {
      // Use the local file below.
    }
  }

  const records = await readFileRegistrations();
  return DEMO_TOURNAMENTS.map((tournament) => ({
    slug: tournament.slug,
    title: tournament.title,
    registrations: records
      .filter((record) => record.slug === tournament.slug)
      .map((record) => ({
        id: record.id,
        playerName: record.playerName,
        email: record.email ?? null,
        phone: record.phone,
        createdAt: record.createdAt,
      })),
  }));
}
