import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { TournamentItem } from "./types";
import {
  cancelTournamentRegistration,
  fileTournamentAccess,
  listPublicTournaments,
  parseSignupCookie,
  registrationListsForViewer,
  registerForTournament,
  removeSignupCookie,
  selectOwnRegistration,
  serializeSignupCookie,
  tournamentStorageMode,
  viewerOwnedSlugs,
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
    async cancelRegistration() {
      throw new Error("database cancel should not run");
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
  assert.deepEqual(parseSignupCookie(removeSignupCookie(second, "shop-weekly")), ["beginner friendly"]);
  assert.equal(removeSignupCookie(second, "missing"), second);
});

test("public registration lists omit the linked user id", () => {
  const lists = registrationListsForViewer(
    [
      {
        slug: "shop-weekly",
        title: "店內週賽",
        registrations: [
          {
            id: "r1",
            playerName: "陳大文",
            email: "secret@example.com",
            phone: "91234567",
            userId: "user-secret-id",
            createdAt: "2026-10-12T00:00:00.000Z",
          },
        ],
      },
    ],
    { isAdmin: true },
  );
  const json = JSON.stringify(lists);
  assert.equal(json.includes("user-secret-id"), false);
  assert.equal(json.includes("secret@example.com"), false);
});

test("cookie signup is not ownership, but the account email or user id is", () => {
  const roster = rosterWithContact[0];
  assert.ok(roster);
  const rosters: RegistrationRoster[] = [
    {
      ...roster,
      registrations: [{ ...roster.registrations[0]!, userId: "user-1" }],
    },
  ];
  assert.equal(viewerOwnedSlugs(rosterWithContact, {}).has("shop-weekly"), false);
  assert.equal(
    viewerRegisteredSlugs(rosterWithContact, { signedSlugs: ["shop-weekly"] }).has("shop-weekly"),
    true,
  );
  assert.equal(viewerOwnedSlugs(rosters, { email: "secret@example.com" }).has("shop-weekly"), true);
  assert.equal(viewerOwnedSlugs(rosters, { userId: "user-1", email: "other@example.com" }).has("shop-weekly"), true);
  assert.equal(
    viewerRegisteredSlugs(rosters, { userId: "user-1", email: "other@example.com" }).has("shop-weekly"),
    true,
  );
});

test("selectOwnRegistration prefers the current email, then the linked user id", () => {
  const rows = [
    { id: "email-row", email: "owner@example.com", userId: null },
    { id: "id-row", email: "old@example.com", userId: "user-1" },
  ];
  assert.equal(
    selectOwnRegistration(rows, { userId: "user-1", email: "owner@example.com" })?.id,
    "email-row",
  );
  assert.equal(
    selectOwnRegistration(rows, { userId: "user-1", email: "moved@example.com" })?.id,
    "id-row",
  );
  assert.equal(selectOwnRegistration(rows, { userId: "user-2", email: "nope@example.com" }), null);
  assert.equal(selectOwnRegistration([{ id: "blank", email: "", userId: null }], { userId: "user-1", email: "" }), null);
});

const owner = { userId: "user-1", email: "player@example.com" };

test("cancel on a missing tournament returns 404 and does not write", async () => {
  const before = fileSnapshot();
  const access = databaseAccess();
  const result = await cancelTournamentRegistration("standard-sat-12", owner, access);
  assert.deepEqual(result, { ok: false, error: "找不到賽事", status: 404 });
  assert.equal(fileSnapshot(), before);
});

test("cancel requires a signed-in member and does not run during a database outage", async () => {
  const access = databaseAccess({
    async findForRegistration() {
      throw Object.assign(new Error("can't reach database"), { code: "P1001" });
    },
  });
  assert.deepEqual(
    await cancelTournamentRegistration("shop-weekly", { userId: " ", email: "player@example.com" }, access),
    { ok: false, error: "請先登入", status: 401 },
  );
  const down = await cancelTournamentRegistration("shop-weekly", owner, access);
  assert.deepEqual(down, { ok: false, error: "數據庫連接失敗，請稍後再試", status: 503 });
});

test("cancel stays available for a full event and stops once signup is over", async () => {
  for (const status of ["COMPLETED", "CANCELLED", "IN_PROGRESS", "DRAFT"]) {
    let calls = 0;
    const access = databaseAccess({
      async findForRegistration() {
        return tournament({ status });
      },
      async cancelRegistration() {
        calls += 1;
        return { ok: true };
      },
    });
    const result = await cancelTournamentRegistration("shop-weekly", owner, access);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.error, "此賽事已不能取消報名");
    }
    assert.equal(calls, 0);
  }

  let calls = 0;
  const access = databaseAccess({
    async findForRegistration() {
      return tournament({ status: "FULL" });
    },
    async cancelRegistration() {
      calls += 1;
      return { ok: true };
    },
  });
  const result = await cancelTournamentRegistration("shop-weekly", owner, access);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 1);
});

test("a signed-in player can cancel only their own signup and register again", async () => {
  const filePath = path.join(tmpdir(), `tournament-regs-${randomUUID()}.json`);
  const access = fileTournamentAccess(filePath);
  const realNow = Date.now;
  Date.now = () => new Date("2026-10-01T00:00:00.000Z").getTime();
  try {
    const mine = await registerForTournament("standard-sat-12", input("Player@Example.com"), access, owner);
    assert.equal(mine.ok, true);
    const other = await registerForTournament(
      "standard-sat-12",
      { playerName: "另一位", email: "other@example.com", phone: "61111111" },
      access,
      { userId: "user-2", email: "other@example.com" },
    );
    assert.equal(other.ok, true);

    const stored = JSON.parse(readFileSync(filePath, "utf8")) as { email?: string; userId?: string }[];
    assert.equal(stored.find((row) => row.email === "player@example.com")?.userId, "user-1");

    const stranger = await registerForTournament(
      "standard-sat-12",
      { playerName: "訪客", email: "guest@example.com", phone: "62222222" },
      access,
      { userId: "user-9", email: "not-guest@example.com" },
    );
    assert.equal(stranger.ok, true);
    const afterGuest = JSON.parse(readFileSync(filePath, "utf8")) as { email?: string; userId?: string }[];
    assert.equal(afterGuest.find((row) => row.email === "guest@example.com")?.userId, undefined);

    const notMine = await cancelTournamentRegistration(
      "standard-sat-12",
      { userId: "user-9", email: "missing@example.com" },
      access,
    );
    assert.deepEqual(notMine, { ok: false, error: "你尚未報名此賽事", status: 404 });

    const cancelled = await cancelTournamentRegistration("standard-sat-12", owner, access);
    assert.deepEqual(cancelled, { ok: true });

    const listed = await listPublicTournaments(access);
    assert.equal(listed.find((item) => item.slug === "standard-sat-12")?.registeredCount, 2);
    const remaining = JSON.parse(readFileSync(filePath, "utf8")) as { email?: string }[];
    assert.equal(remaining.some((row) => row.email === "player@example.com"), false);
    assert.equal(remaining.some((row) => row.email === "other@example.com"), true);

    const again = await registerForTournament("standard-sat-12", input("player@example.com"), access, owner);
    assert.equal(again.ok, true);
    const relisted = await listPublicTournaments(access);
    assert.equal(relisted.find((item) => item.slug === "standard-sat-12")?.registeredCount, 3);
  } finally {
    Date.now = realNow;
    rmSync(filePath, { force: true });
  }
});
