import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { TournamentItem } from "@/lib/types";

export type RegistrationRecord = {
  id: string;
  slug: string;
  playerName: string;
  phone: string;
  createdAt: string;
};

const filePath = path.join(process.cwd(), "data", "tournament-registrations.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("852") && digits.length === 11) digits = digits.slice(3);
  if (!/^\d{8}$/.test(digits)) return null;
  return digits;
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

export function registrationOpen(tournament: TournamentItem, now = new Date()) {
  if (tournament.status !== "OPEN") return false;
  if (tournament.registeredCount >= tournament.maxPlayers) return false;
  return new Date(tournament.registrationDeadline).getTime() > now.getTime();
}

type RegisterResult =
  | { ok: true; registration: RegistrationRecord }
  | { ok: false; error: string; status: number };

export async function registerForTournament(
  slug: string,
  playerName: string,
  phoneInput: string,
): Promise<RegisterResult> {
  const name = playerName.trim();
  if (!name || name.length > 40) {
    return { ok: false, error: "請填寫名字", status: 400 };
  }
  const phone = normalizePhone(phoneInput);
  if (!phone) {
    return { ok: false, error: "請填寫 8 位香港手機號碼", status: 400 };
  }

  if (isDatabaseConfigured()) {
    try {
      const saved = await registerInDatabase(slug, name, phone);
      if (saved) return saved;
    } catch {
      // The database is configured but unavailable; keep the local list working.
    }
  }

  const tournament = demoBySlug(slug);
  if (!tournament) return { ok: false, error: "找不到賽事", status: 404 };
  return registerInFile(tournament, name, phone);
}

async function registerInDatabase(
  slug: string,
  playerName: string,
  phone: string,
): Promise<RegisterResult | null> {
  const prisma = getPrisma();
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) return null;

  const publicTournament = mapDbTournament(tournament);
  if (publicTournament.status !== "OPEN") {
    return { ok: false, error: "這場賽事未有開放報名", status: 400 };
  }
  if (new Date(publicTournament.registrationDeadline).getTime() <= Date.now()) {
    return { ok: false, error: "報名已截止", status: 400 };
  }
  if (publicTournament.registeredCount >= publicTournament.maxPlayers) {
    return { ok: false, error: "名額已滿", status: 400 };
  }

  const existing = await prisma.tournamentRegistration.findFirst({
    where: { tournamentId: tournament.id, phone },
  });
  if (existing) return { ok: false, error: "此號碼已報名", status: 409 };

  const created = await prisma.tournamentRegistration.create({
    data: {
      tournamentId: tournament.id,
      playerName,
      phone,
    },
  });

  return {
    ok: true,
    registration: {
      id: created.id,
      slug,
      playerName: created.playerName,
      phone: created.phone,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

async function registerInFile(
  tournament: (typeof DEMO_TOURNAMENTS)[number],
  playerName: string,
  phone: string,
): Promise<RegisterResult> {
  if (tournament.status !== "OPEN") {
    return { ok: false, error: "這場賽事未有開放報名", status: 400 };
  }
  if (new Date(tournament.registrationDeadline).getTime() <= Date.now()) {
    return { ok: false, error: "報名已截止", status: 400 };
  }

  let result: RegisterResult = { ok: false, error: "報名失敗", status: 500 };
  await updateFileRegistrations((records) => {
    const mine = records.filter((record) => record.slug === tournament.slug);
    if (mine.length >= tournament.maxPlayers) {
      result = { ok: false, error: "名額已滿", status: 400 };
      return records;
    }
    if (mine.some((record) => record.phone === phone)) {
      result = { ok: false, error: "此號碼已報名", status: 409 };
      return records;
    }
    const registration: RegistrationRecord = {
      id: crypto.randomUUID(),
      slug: tournament.slug,
      playerName,
      phone,
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
        phone: record.phone,
        createdAt: record.createdAt,
      })),
  }));
}
