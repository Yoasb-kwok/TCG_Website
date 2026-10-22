import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { getPrisma } from "@/lib/prisma";
import {
  parseRegistrationInput,
  registrationClosedLabel,
  registrationConflict,
} from "@/lib/registration-input";
import type { RegistrationInput, TournamentItem } from "@/lib/types";

export type RegistrationRecord = {
  id: string;
  slug: string;
  playerName: string;
  phone: string;
  email?: string;
  createdAt: string;
  /** Set when the signup email is the signed-in member. Omitted for guest signups. */
  userId?: string;
};

export type RegistrationRoster = {
  slug: string;
  title: string;
  registrations: {
    id: string;
    playerName: string;
    email: string | null;
    phone: string;
    createdAt: string;
    userId?: string | null;
  }[];
};

/**
 * Where tournament reads and signups go.
 * Database mode never touches the local JSON file, including when the table is empty.
 */
export type TournamentAccess = {
  listPublic(): Promise<TournamentItem[]>;
  findForRegistration(slug: string): Promise<TournamentItem | null>;
  saveRegistration(
    tournament: TournamentItem,
    input: RegistrationInput,
    userId?: string | null,
  ): Promise<RegisterResult>;
  cancelRegistration(tournament: TournamentItem, owner: CancelOwner): Promise<CancelResult>;
  listRosters(): Promise<RegistrationRoster[]>;
};

type RegisterResult =
  | { ok: true; registration: RegistrationRecord }
  | { ok: false; error: string; status: number };

/** Signed-in member. Cancel never trusts the signup cookie by itself. */
export type CancelOwner = {
  userId: string;
  email: string;
};

export type CancelResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export type OwnedRegistrationRow = {
  id: string;
  userId?: string | null;
  email?: string | null;
};

/**
 * The row this member may cancel.
 * Current account email wins. If the member changed email, the linked user id still matches.
 * A blank email does not match guest rows that have no email.
 */
export function selectOwnRegistration<T extends OwnedRegistrationRow>(
  rows: T[],
  owner: CancelOwner,
): T | null {
  const userId = owner.userId.trim();
  const email = owner.email.trim().toLowerCase();
  if (!userId || !email) return null;
  const byEmail = rows.find((row) => (row.email ?? "").trim().toLowerCase() === email);
  if (byEmail) return byEmail;
  return rows.find((row) => (row.userId ?? "") === userId) ?? null;
}

/** OPEN and FULL still have a seat to give back. Later states keep the roster as history. */
export function cancelRegistrationRefusal(status: string): string | null {
  if (status === "OPEN" || status === "FULL") return null;
  return "此賽事已不能取消報名";
}

const defaultFilePath = path.join(process.cwd(), "data", "tournament-registrations.json");

const DB_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "P1001",
  "P1002",
  "P1017",
]);

const FILE_REFUSED = new Set(["ENOENT", "EROFS", "EPERM", "EACCES"]);

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

/** Database when DATABASE_URL is set. The JSON file is only for a local demo without a database. */
export function tournamentStorageMode(databaseUrl = process.env.DATABASE_URL): "database" | "file" {
  return databaseUrl ? "database" : "file";
}

function defaultAccess(): TournamentAccess {
  return tournamentStorageMode() === "database" ? prismaAccess() : fileAccess(defaultFilePath);
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

function closedRegistrationError(tournament: TournamentItem): RegisterResult | null {
  const closed = registrationClosedLabel(tournament);
  if (!closed) return null;
  const error =
    closed === "賽事已取消" || closed === "賽事已結束" ? "此賽事已不再接受報名" : closed;
  return { ok: false, error, status: 400 };
}

function prismaAccess(): TournamentAccess {
  return {
    async listPublic() {
      const tournaments = await getPrisma().tournament.findMany({
        where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS"] } },
        include: { _count: { select: { registrations: true } } },
        orderBy: { startsAt: "asc" },
      });
      return tournaments.map(mapDbTournament);
    },
    async findForRegistration(slug) {
      const tournament = await getPrisma().tournament.findUnique({
        where: { slug },
        include: { _count: { select: { registrations: true } } },
      });
      return tournament ? mapDbTournament(tournament) : null;
    },
    async saveRegistration(tournament, input, userId) {
      const closed = closedRegistrationError(tournament);
      if (closed) return closed;

      try {
        const outcome = await getPrisma().$transaction(async (tx) => {
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
              userId: userId || null,
            },
          });
          return { ok: true as const, created };
        });

        if (!outcome.ok) return outcome;
        return {
          ok: true,
          registration: {
            id: outcome.created.id,
            slug: tournament.slug,
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
    },
    async cancelRegistration(tournament, owner) {
      const rows = await getPrisma().tournamentRegistration.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true, userId: true, email: true },
      });
      const target = selectOwnRegistration(rows, owner);
      if (!target) return { ok: false, error: "你尚未報名此賽事", status: 404 };
      try {
        await getPrisma().tournamentRegistration.delete({ where: { id: target.id } });
      } catch (error) {
        if (errorCode(error) === "P2025") {
          return { ok: false, error: "你尚未報名此賽事", status: 404 };
        }
        throw error;
      }
      return { ok: true };
    },
    async listRosters() {
      const tournaments = await getPrisma().tournament.findMany({
        where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS"] } },
        include: { registrations: { orderBy: { createdAt: "asc" } } },
        orderBy: { startsAt: "asc" },
      });
      return tournaments.map((tournament) => ({
        slug: tournament.slug,
        title: tournament.title,
        registrations: tournament.registrations.map((registration) => ({
          id: registration.id,
          playerName: registration.playerName,
          email: registration.email,
          phone: registration.phone,
          userId: registration.userId,
          createdAt: registration.createdAt.toISOString(),
        })),
      }));
    },
  };
}

async function readFileRegistrations(filePath: string): Promise<RegistrationRecord[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as RegistrationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (errorCode(error) === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function updateFileRegistrations(
  filePath: string,
  update: (records: RegistrationRecord[]) => RegistrationRecord[] | Promise<RegistrationRecord[]>,
) {
  let next: RegistrationRecord[] = [];
  const run = writeQueue.then(async () => {
    const current = await readFileRegistrations(filePath);
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

function demoWithCounts(records: RegistrationRecord[]): TournamentItem[] {
  return DEMO_TOURNAMENTS.map((tournament) => ({
    ...tournament,
    registeredCount: records.filter((record) => record.slug === tournament.slug).length,
  }));
}

function fileAccess(filePath: string): TournamentAccess {
  return {
    async listPublic() {
      return demoWithCounts(await readFileRegistrations(filePath));
    },
    async findForRegistration(slug) {
      const tournaments = demoWithCounts(await readFileRegistrations(filePath));
      return tournaments.find((tournament) => tournament.slug === slug) ?? null;
    },
    async saveRegistration(tournament, input, userId) {
      const demo = DEMO_TOURNAMENTS.find((item) => item.slug === tournament.slug);
      if (!demo) return { ok: false, error: "找不到賽事", status: 404 };
      if (demo.status !== "OPEN") {
        return { ok: false, error: "此賽事已不再接受報名", status: 400 };
      }
      const deadline = new Date(demo.registrationDeadline).getTime();
      if (Number.isNaN(deadline) || deadline <= Date.now()) {
        return { ok: false, error: "報名已截止", status: 400 };
      }

      try {
        let result: RegisterResult = { ok: false, error: "報名失敗，請重試", status: 500 };
        await updateFileRegistrations(filePath, (records) => {
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
            ...(userId ? { userId } : {}),
          };
          result = {
            ok: true,
            registration: {
              id: registration.id,
              slug: registration.slug,
              playerName: registration.playerName,
              email: registration.email,
              phone: registration.phone,
              createdAt: registration.createdAt,
            },
          };
          return [...records, registration];
        });
        return result;
      } catch (error) {
        if (FILE_REFUSED.has(errorCode(error))) {
          return { ok: false, error: "報名系統暫時無法使用", status: 503 };
        }
        throw error;
      }
    },
    async cancelRegistration(tournament, owner) {
      try {
        let result: CancelResult = { ok: false, error: "你尚未報名此賽事", status: 404 };
        await updateFileRegistrations(filePath, (records) => {
          const mine = records.filter((record) => record.slug === tournament.slug);
          const target = selectOwnRegistration(mine, owner);
          if (!target) {
            result = { ok: false, error: "你尚未報名此賽事", status: 404 };
            return records;
          }
          result = { ok: true };
          return records.filter((record) => record.id !== target.id);
        });
        return result;
      } catch (error) {
        if (FILE_REFUSED.has(errorCode(error))) {
          return { ok: false, error: "報名系統暫時無法使用", status: 503 };
        }
        throw error;
      }
    },
    async listRosters() {
      const records = await readFileRegistrations(filePath);
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
            userId: record.userId ?? null,
            createdAt: record.createdAt,
          })),
      }));
    },
  };
}

async function readOrEmpty<T>(access: TournamentAccess, read: (source: TournamentAccess) => Promise<T>, empty: T): Promise<T> {
  try {
    return await read(access);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    console.error("Tournament database unavailable:", error);
    return empty;
  }
}

export async function listPublicTournaments(access = defaultAccess()): Promise<TournamentItem[]> {
  return readOrEmpty(access, (source) => source.listPublic(), []);
}

export async function getPublicTournament(
  slug: string,
  access = defaultAccess(),
): Promise<TournamentItem | null> {
  const tournaments = await listPublicTournaments(access);
  return tournaments.find((tournament) => tournament.slug === slug) ?? null;
}

export async function registerForTournament(
  slug: string,
  input: {
    playerName?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  access = defaultAccess(),
  owner?: CancelOwner | null,
): Promise<RegisterResult> {
  const parsed = parseRegistrationInput(input);
  if (!parsed.ok) return parsed;

  const linkedUserId =
    owner &&
    owner.userId.trim() &&
    (owner.email.trim().toLowerCase() === parsed.value.email)
      ? owner.userId.trim()
      : null;

  try {
    const tournament = await access.findForRegistration(slug);
    if (!tournament) return { ok: false, error: "找不到賽事", status: 404 };
    return await access.saveRegistration(tournament, parsed.value, linkedUserId);
  } catch (error) {
    if (isDbConnectionError(error)) {
      return { ok: false, error: "數據庫連接失敗，請稍後再試", status: 503 };
    }
    if (FILE_REFUSED.has(errorCode(error))) {
      return { ok: false, error: "報名系統暫時無法使用", status: 503 };
    }
    console.error("Registration error:", error);
    return { ok: false, error: "報名失敗，請重試", status: 500 };
  }
}

export async function listRegistrationRosters(access = defaultAccess()): Promise<RegistrationRoster[]> {
  return readOrEmpty(access, (source) => source.listRosters(), []);
}

export async function cancelTournamentRegistration(
  slug: string,
  owner: CancelOwner,
  access = defaultAccess(),
): Promise<CancelResult> {
  const userId = owner.userId.trim();
  const email = owner.email.trim().toLowerCase();
  if (!userId || !email || !email.includes("@")) {
    return { ok: false, error: "請先登入", status: 401 };
  }

  try {
    const tournament = await access.findForRegistration(slug);
    if (!tournament) return { ok: false, error: "找不到賽事", status: 404 };
    const refused = cancelRegistrationRefusal(tournament.status);
    if (refused) return { ok: false, error: refused, status: 400 };
    return await access.cancelRegistration(tournament, { userId, email });
  } catch (error) {
    if (isDbConnectionError(error)) {
      return { ok: false, error: "數據庫連接失敗，請稍後再試", status: 503 };
    }
    if (FILE_REFUSED.has(errorCode(error))) {
      return { ok: false, error: "報名系統暫時無法使用", status: 503 };
    }
    console.error("Cancel registration error:", error);
    return { ok: false, error: "取消報名失敗，請重試", status: 500 };
  }
}

export function fileTournamentAccess(filePath: string): TournamentAccess {
  return fileAccess(filePath);
}

/** Browser cookie remembering which events this visitor signed up for. Slugs only, no contact details. */
export const SIGNUP_COOKIE = "tcg_tournament_signups";

const MAX_SIGNUP_SLUGS = 40;

export function parseSignupCookie(value: string | undefined | null): string[] {
  if (!value) return [];
  const slugs: string[] = [];
  for (const part of value.split(",")) {
    if (!part) continue;
    let slug = part;
    try {
      slug = decodeURIComponent(part);
    } catch {
      continue;
    }
    slug = slug.trim();
    if (!slug || slugs.includes(slug)) continue;
    slugs.push(slug);
    if (slugs.length >= MAX_SIGNUP_SLUGS) break;
  }
  return slugs;
}

export function serializeSignupCookie(current: string | undefined | null, slug: string): string {
  const next = parseSignupCookie(current).filter((item) => item !== slug);
  next.push(slug.trim());
  return next
    .slice(-MAX_SIGNUP_SLUGS)
    .map((item) => encodeURIComponent(item))
    .join(",");
}

export function removeSignupCookie(current: string | undefined | null, slug: string): string {
  return parseSignupCookie(current)
    .filter((item) => item !== slug.trim())
    .map((item) => encodeURIComponent(item))
    .join(",");
}

export type ViewerRegistrationList = {
  slug: string;
  title: string;
  registrations: { id: string; playerName: string; phone?: string }[];
};

/** Public readers get names only. A signed-in admin also gets the phone the scoreboard roster already shows. */
export function registrationListsForViewer(
  rosters: RegistrationRoster[],
  viewer: { isAdmin: boolean },
): ViewerRegistrationList[] {
  return rosters.map((roster) => ({
    slug: roster.slug,
    title: roster.title,
    registrations: roster.registrations.map((row) =>
      viewer.isAdmin
        ? { id: row.id, playerName: row.playerName, phone: row.phone }
        : { id: row.id, playerName: row.playerName },
    ),
  }));
}

/** Events this visitor already joined, matched by account, linked user id, or the signup cookie. */
export function viewerRegisteredSlugs(
  rosters: RegistrationRoster[],
  viewer: { email?: string | null; userId?: string | null; signedSlugs?: readonly string[] },
): Set<string> {
  const email = (viewer.email ?? "").trim().toLowerCase();
  const userId = (viewer.userId ?? "").trim();
  const signed = new Set(viewer.signedSlugs ?? []);
  const matched = new Set<string>();
  for (const roster of rosters) {
    if (signed.has(roster.slug)) {
      matched.add(roster.slug);
      continue;
    }
    const joined = roster.registrations.some((row) => {
      if (userId && (row.userId ?? "") === userId) return true;
      if (!email) return false;
      return (row.email ?? "").trim().toLowerCase() === email;
    });
    if (joined) matched.add(roster.slug);
  }
  return matched;
}

/** Events this signed-in member can cancel. The signup cookie is not ownership. */
export function viewerOwnedSlugs(
  rosters: RegistrationRoster[],
  viewer: { email?: string | null; userId?: string | null },
): Set<string> {
  return viewerRegisteredSlugs(rosters, viewer);
}
