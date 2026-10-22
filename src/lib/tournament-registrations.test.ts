import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { TournamentItem } from "./types";
import {
  fileTournamentAccess,
  listPublicTournaments,
  parseSignupCookie,
  registrationListsForViewer,
  registerForTournament,
  serializeSignupCookie,
  tournamentStorageMode,
  viewerRegisteredSlugs,
  type RegistrationRoster,
  type TournamentAccess,
} from "./tournament-registrations";

const defaultFile = path.join(process.cwd(), "data", "tournament-registrations.json");

function input(email = "player@example.com") {
  return { playerName: "測試員", email, phone: "91234567" };
}

function tournament(overrides: Partial<TournamentItem> = {}): TournamentItem {
  return {
    id: "db-1",
    title: "店內週賽",
    slug: "shop-weekly",
    description: null,
    format: "Standard",
    maxPlayers: 8,
    entryFee: 0,
    prizePool: null,
    location: "旺角店",
    startsAt: "2026-10-17T06:00:00.000Z",
    registrationDeadline: "2026-10-16T15:59:00.000Z",
    status: "OPEN",
    registeredCount: 0,
    ...overrides,
  };
}

function databaseAccess(overrides: Partial<TournamentAccess> = {}): TournamentAccess & { saves: number } {
  const state = { saves: 0 };
  const access: TournamentAccess & { saves: number } = {
    saves: 0,
    async listPublic() {
      return [];
    },
    async findForRegistration() {
      return null;
    },
    async saveRegistration() {
      state.saves += 1;
      access.saves = state.saves;
      throw new Error("database save should not run");
    },
    async listRosters() {
      return [];
    },
    ...overrides,
  };
  return access;
}

function fileSnapshot() {
  return existsSync(defaultFile) ? readFileSync(defaultFile, "utf8") : null;
}

test("tournament storage uses the database only when DATABASE_URL is set", () => {
  assert.equal(tournamentStorageMode("postgresql://db.example/prod"), "database");
  assert.equal(tournamentStorageMode(undefined), "file");
  assert.equal(tournamentStorageMode(""), "file");
});

test("configured database with no tournament row returns 404 and does not write a file", async () => {
  const before = fileSnapshot();
  const access = databaseAccess();
  const result = await registerForTournament("standard-sat-12", input("missing@example.com"), access);

  assert.deepEqual(result, { ok: false, error: "找不到賽事", status: 404 });
  assert.equal(access.saves, 0);
  assert.equal(fileSnapshot(), before);
});

test("database connection failure does not fall back to the registration file", async () => {
  const before = fileSnapshot();
  const access = databaseAccess({
    async findForRegistration() {
      throw Object.assign(new Error("can't reach database"), { code: "P1001" });
    },
  });
  const result = await registerForTournament("standard-sat-12", input("down@example.com"), access);

  assert.deepEqual(result, { ok: false, error: "數據庫連接失敗，請稍後再試", status: 503 });
  assert.equal(access.saves, 0);
  assert.equal(fileSnapshot(), before);
});

test("an empty database lists no demo tournaments", async () => {
  const listed = await listPublicTournaments(databaseAccess());
  assert.deepEqual(listed, []);
});

test("a database outage lists nothing instead of the demo schedule", async () => {
  const listed = await listPublicTournaments(
    databaseAccess({
      async listPublic() {
        throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
      },
    }),
  );
  assert.deepEqual(listed, []);
});

test("database rows are returned as stored, without demo ids", async () => {
  const row = tournament();
  const listed = await listPublicTournaments(
    databaseAccess({
      async listPublic() {
        return [row];
      },
    }),
  );
  assert.deepEqual(
    listed.map((item) => item.slug),
    ["shop-weekly"],
  );
  assert.equal(listed.some((item) => item.id === "t-1"), false);
});

test("local demo registration still writes a file when no database is configured", async () => {
  const filePath = path.join(tmpdir(), `tournament-regs-${randomUUID()}.json`);
  const access = fileTournamentAccess(filePath);
  const realNow = Date.now;
  Date.now = () => new Date("2026-10-01T00:00:00.000Z").getTime();
  try {
    const saved = await registerForTournament("standard-sat-12", input("Demo@Example.com"), access);
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.registration.email, "demo@example.com");
    assert.equal(saved.registration.phone, "91234567");

    const duplicate = await registerForTournament(
      "standard-sat-12",
      input("demo@example.com"),
      access,
    );
    assert.deepEqual(duplicate, { ok: false, error: "此電郵已報名此賽事", status: 409 });

    const missing = await registerForTournament("no-such-event", input("other@example.com"), access);
    assert.deepEqual(missing, { ok: false, error: "找不到賽事", status: 404 });

    const listed = await listPublicTournaments(access);
    assert.equal(listed.find((item) => item.slug === "standard-sat-12")?.registeredCount, 1);
    assert.equal(existsSync(filePath), true);
    assert.match(readFileSync(filePath, "utf8"), /demo@example.com/);
  } finally {
    Date.now = realNow;
    rmSync(filePath, { force: true });
  }
});

const rosterWithContact: RegistrationRoster[] = [
  {
    slug: "shop-weekly",
    title: "店內週賽",
    registrations: [
      {
        id: "r1",
        playerName: "陳大文",
        email: "Secret@Example.com",
        phone: "91234567",
        createdAt: "2026-10-12T00:00:00.000Z",
      },
    ],
  },
];

test("public registration lists keep names only", () => {
  const lists = registrationListsForViewer(rosterWithContact, { isAdmin: false });
  assert.deepEqual(lists, [
    {
      slug: "shop-weekly",
      title: "店內週賽",
      registrations: [{ id: "r1", playerName: "陳大文" }],
    },
  ]);
  const json = JSON.stringify(lists);
  assert.equal(json.includes("Secret@Example.com"), false);
  assert.equal(json.includes("91234567"), false);
  assert.equal(json.includes("createdAt"), false);
});

test("admin registration lists keep the scoreboard phone and still hide email", () => {
  const lists = registrationListsForViewer(rosterWithContact, { isAdmin: true });
  assert.equal(lists[0]?.registrations[0]?.phone, "91234567");
  assert.equal(JSON.stringify(lists).includes("Secret@Example.com"), false);
});

test("a viewer is signed up by cookie or by their own email", () => {
  assert.equal(
    viewerRegisteredSlugs(rosterWithContact, { signedSlugs: ["shop-weekly"] }).has("shop-weekly"),
    true,
  );
  assert.equal(
    viewerRegisteredSlugs(rosterWithContact, { email: "secret@example.com" }).has("shop-weekly"),
    true,
  );
  assert.equal(
    viewerRegisteredSlugs(rosterWithContact, { email: "other@example.com" }).has("shop-weekly"),
    false,
  );
  assert.equal(viewerRegisteredSlugs(rosterWithContact, { email: "" }).size, 0);
});

test("the signup cookie stores slugs only", () => {
  const first = serializeSignupCookie(undefined, "shop-weekly");
  const second = serializeSignupCookie(first, "beginner friendly");
  assert.deepEqual(parseSignupCookie(second), ["shop-weekly", "beginner friendly"]);
  assert.equal(second.includes("@"), false);
  assert.deepEqual(parseSignupCookie("%"), []);
});
