/**
 * Tournament Trash Bin (Soft Delete) — Automated Test Suite
 *
 * Tests the trash / restore / permanent-delete API endpoints against a live
 * dev server (default http://localhost:3000). Uses the NextAuth credentials
 * flow to obtain a session cookie.
 *
 * Usage:
 *   1. Make sure the dev server is running:  npm run dev
 *   2. Run:  node prisma/test-trash.mjs
 *
 * Environment variables (read from .env automatically via dotenv):
 *   ADMIN_EMAIL     — default admin@trtcg.hk
 *   ADMIN_PASSWORD  — required
 */

import "dotenv/config";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@trtcg.hk";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("✗ ADMIN_PASSWORD is not set in .env");
  process.exit(1);
}

// ── Test framework ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function ok(name) {
  passed++;
  console.log(`  ✅ ${name}`);
}

function fail(name, detail) {
  failed++;
  const msg = detail ? `${name} — ${detail}` : name;
  failures.push(msg);
  console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
}

function assert(name, condition, detail) {
  if (condition) ok(name);
  else fail(name, detail);
}

function section(title) {
  console.log(`\n── ${title} ──────────────────────────────`);
}

// ── HTTP helpers ────────────────────────────────────────────────────────

async function getCookieJar() {
  // Step 1: fetch CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrf = (await csrfRes.json()).csrfToken;
  const cookies = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  // Step 2: sign in with credentials
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      Cookie: cookies,
    },
    body: new URLSearchParams({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      csrfToken: csrf,
      json: "true",
    }),
    redirect: "manual",
  });

  const loginCookies = loginRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  return [cookies, loginCookies].filter(Boolean).join("; ");
}

async function api(method, path, body, cookie) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// ── Test data helpers ───────────────────────────────────────────────────

const PREFIX = `test-trash-${Date.now().toString(36)}`;

async function createTournament(cookie, overrides = {}) {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const dateStr = futureDate.toISOString().slice(0, 10);
  const { status, data } = await api(
    "POST",
    "/api/admin/tournaments",
    {
      title: `${PREFIX}-${overrides.suffix ?? "t"}`,
      format: "Standard",
      maxPlayers: overrides.maxPlayers ?? 8,
      entryFee: overrides.entryFee ?? 0,
      location: "測試門市",
      startsAt: `${dateStr}T14:00`,
      registrationDeadline: `${dateStr}T12:00`,
      durationMinutes: 120,
      prizePool: overrides.prizePool ?? "",
      ...overrides,
    },
    cookie,
  );
  if (status !== 200 || !data?.tournament) {
    throw new Error(`Failed to create tournament: ${JSON.stringify(data)}`);
  }
  return data.tournament;
}

async function registerForTournament(tournamentId, email, phone) {
  return api("POST", "/api/tournaments/register", {
    tournamentId,
    playerName: "測試玩家",
    email: email ?? `test-${Date.now()}@example.com`,
    phone: phone ?? "98765432",
  });
}

async function getAdminList(cookie) {
  const { data } = await api(
    "GET",
    "/api/admin/tournaments",
    undefined,
    cookie,
  );
  return data?.tournaments ?? [];
}

async function getTrashList(cookie) {
  const { data } = await api(
    "GET",
    "/api/admin/tournaments/trash",
    undefined,
    cookie,
  );
  return data?.tournaments ?? [];
}

async function getPublicList() {
  const { data } = await api("GET", "/api/tournaments");
  return data?.tournaments ?? [];
}

async function trash(cookie, ids) {
  return api("POST", "/api/admin/tournaments/trash", { ids }, cookie);
}

async function restore(cookie, ids) {
  return api("POST", "/api/admin/tournaments/restore", { ids }, cookie);
}

async function permanentDelete(cookie, body) {
  return api("DELETE", "/api/admin/tournaments/bin", body, cookie);
}

// ── Main test runner ────────────────────────────────────────────────────

async function main() {
  console.log("Tournament Trash Bin — Test Suite");
  console.log(`Target: ${BASE}`);
  console.log(`Admin:  ${ADMIN_EMAIL}`);
  console.log(`Prefix: ${PREFIX}`);

  // ── Login ───────────────────────────────────────────────────────────
  section("Auth");
  let cookie;
  try {
    cookie = await getCookieJar();
  } catch (e) {
    console.error("✗ Failed to log in:", e.message);
    process.exit(1);
  }

  // Verify session works by hitting admin endpoint
  const authCheck = await api(
    "GET",
    "/api/admin/tournaments",
    undefined,
    cookie,
  );
  assert("Admin login works (200)", authCheck.status === 200);

  // ── Create test tournaments ─────────────────────────────────────────
  section("Setup");
  const t1 = await createTournament(cookie, { suffix: "open" });
  const t2 = await createTournament(cookie, { suffix: "second" });
  const t3 = await createTournament(cookie, { suffix: "third" });
  const t4 = await createTournament(cookie, { suffix: "fourth" });
  const t5 = await createTournament(cookie, { suffix: "fifth" });
  console.log(`  Created 5 test tournaments`);

  const allIds = [t1.id, t2.id, t3.id, t4.id, t5.id];
  const allTitles = [t1.title, t2.title, t3.title, t4.title, t5.title];

  // ════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ════════════════════════════════════════════════════════════════════
  section("Happy Path");

  // H-01: Trash a single tournament
  {
    const { status, data } = await trash(cookie, [t1.id]);
    assert("H-01 trash single → 200", status === 200);
    assert("H-01 returns count=1", data?.count === 1);

    // Should appear in trash list
    const trashList = await getTrashList(cookie);
    assert(
      "H-01 appears in trash list",
      trashList.some((t) => t.id === t1.id),
    );
    assert(
      "H-01 has deletedAt set",
      trashList.find((t) => t.id === t1.id)?.deletedAt != null,
    );
  }

  // H-02: Trashed tournament disappears from admin list
  {
    const adminList = await getAdminList(cookie);
    assert(
      "H-02 hidden from admin list",
      !adminList.some((t) => t.id === t1.id),
    );
  }

  // H-03: Trashed tournament disappears from public list
  {
    const publicList = await getPublicList();
    assert(
      "H-03 hidden from public list",
      !publicList.some((t) => t.id === t1.id),
    );
  }

  // H-04: Restore a trashed tournament
  {
    const { status, data } = await restore(cookie, [t1.id]);
    assert("H-04 restore → 200", status === 200);
    assert("H-04 returns count=1", data?.count === 1);

    // Should reappear in admin list
    const adminList = await getAdminList(cookie);
    assert(
      "H-04 reappears in admin list",
      adminList.some((t) => t.id === t1.id),
    );

    // Should no longer be in trash
    const trashList = await getTrashList(cookie);
    assert(
      "H-04 removed from trash list",
      !trashList.some((t) => t.id === t1.id),
    );
  }

  // H-05: Trash multiple tournaments (bulk)
  {
    const { status, data } = await trash(cookie, [t2.id, t3.id]);
    assert("H-05 trash bulk (2) → 200", status === 200);
    assert("H-05 returns count=2", data?.count === 2);

    const trashList = await getTrashList(cookie);
    assert(
      "H-05 both in trash",
      trashList.some((t) => t.id === t2.id) &&
        trashList.some((t) => t.id === t3.id),
    );
  }

  // H-06: Restore multiple tournaments (bulk)
  {
    const { status } = await restore(cookie, [t2.id, t3.id]);
    assert("H-06 restore bulk → 200", status === 200);

    const trashList = await getTrashList(cookie);
    assert(
      "H-06 restored items removed from trash",
      !trashList.some((t) => t.id === t2.id) &&
        !trashList.some((t) => t.id === t3.id),
    );
  }

  // H-07: Permanent delete a single trashed tournament
  {
    await trash(cookie, [t4.id]);
    const { status, data } = await permanentDelete(cookie, { ids: [t4.id] });
    assert("H-07 permanent delete → 200", status === 200);
    assert("H-07 returns count=1", data?.count === 1);

    // Should be gone from trash
    const trashList = await getTrashList(cookie);
    assert("H-07 gone from trash", !trashList.some((t) => t.id === t4.id));

    // Should not be in admin list either
    const adminList = await getAdminList(cookie);
    assert("H-07 gone from admin", !adminList.some((t) => t.id === t4.id));
  }

  // H-08: Permanent delete multiple (bulk)
  {
    await trash(cookie, [t5.id]);
    // Also trash an extra one for the clear-all test
    const t6 = await createTournament(cookie, { suffix: "sixth" });
    await trash(cookie, [t6.id]);

    const { status, data } = await permanentDelete(cookie, {
      ids: [t5.id, t6.id],
    });
    assert("H-08 bulk delete → 200", status === 200);
    assert("H-08 returns count=2", data?.count === 2);

    const trashList = await getTrashList(cookie);
    assert(
      "H-08 deleted items gone from trash",
      !trashList.some((t) => t.id === t5.id) &&
        !trashList.some((t) => t.id === t6.id),
    );
  }

  // H-09: Clear all trash (all: true)
  {
    const t7 = await createTournament(cookie, { suffix: "seventh" });
    const t8 = await createTournament(cookie, { suffix: "eighth" });
    await trash(cookie, [t7.id, t8.id]);

    const trashBefore = await getTrashList(cookie);
    assert(
      "H-09 both new items in trash before clear",
      trashBefore.some((t) => t.id === t7.id) &&
        trashBefore.some((t) => t.id === t8.id),
    );

    const { status, data } = await permanentDelete(cookie, { all: true });
    assert("H-09 clear all → 200", status === 200);
    assert("H-09 returns count≥2", data?.count >= 2);

    const trashAfter = await getTrashList(cookie);
    assert("H-09 trash empty after clear all", trashAfter.length === 0);
  }

  // ════════════════════════════════════════════════════════════════════
  // BLOCKED OPERATIONS (trashed = behaves like cancelled)
  // ════════════════════════════════════════════════════════════════════
  section("Blocked Operations on Trashed Tournaments");

  // B-01: Cannot register for a trashed tournament
  {
    const tBlock = await createTournament(cookie, { suffix: "block-reg" });
    await trash(cookie, [tBlock.id]);

    const { status, data } = await registerForTournament(tBlock.id);
    assert("B-01 register blocked → 404", status === 404);
    assert("B-01 error message = 賽事不存在", data?.error === "賽事不存在");
  }

  // B-02: Cannot change status of a trashed tournament
  {
    const tBlock = await createTournament(cookie, { suffix: "block-status" });
    await trash(cookie, [tBlock.id]);

    const { status, data } = await api(
      "PATCH",
      `/api/admin/tournaments/${tBlock.id}`,
      { status: "CANCELLED" },
      cookie,
    );
    assert("B-02 status change blocked → 403", status === 403);
    assert(
      "B-02 error = 此賽事已在回收站，無法修改",
      data?.error === "此賽事已在回收站，無法修改",
    );
  }

  // B-03: Cannot change deadline of a trashed tournament
  {
    const tBlock = await createTournament(cookie, { suffix: "block-deadline" });
    await trash(cookie, [tBlock.id]);

    const futureDate = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
    const { status, data } = await api(
      "PATCH",
      `/api/admin/tournaments/${tBlock.id}`,
      {
        registrationDeadline: futureDate.toISOString(),
      },
      cookie,
    );
    assert("B-03 deadline change blocked → 403", status === 403);
    assert(
      "B-03 error = 此賽事已在回收站，無法修改",
      data?.error === "此賽事已在回收站，無法修改",
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // EDGE CASES / EXTREME
  // ════════════════════════════════════════════════════════════════════
  section("Edge Cases / Extreme");

  // E-01: Trash already-trashed tournament (idempotent via updateMany)
  {
    const t = await createTournament(cookie, { suffix: "double-trash" });
    await trash(cookie, [t.id]);
    const { status } = await trash(cookie, [t.id]);
    assert("E-01 re-trash → 200 (idempotent)", status === 200);

    const trashList = await getTrashList(cookie);
    const found = trashList.find((x) => x.id === t.id);
    assert("E-01 still in trash once", found != null);
  }

  // E-02: Restore already-restored (non-trashed) tournament
  {
    const t = await createTournament(cookie, { suffix: "double-restore" });
    await trash(cookie, [t.id]);
    await restore(cookie, [t.id]);
    // Now restore again — should not error (updateMany silently 0 rows)
    const { status } = await restore(cookie, [t.id]);
    assert("E-02 re-restore → 200 (idempotent)", status === 200);

    const adminList = await getAdminList(cookie);
    assert(
      "E-02 still in admin list",
      adminList.some((x) => x.id === t.id),
    );
  }

  // E-03: Permanent delete a non-trashed tournament (should not delete)
  {
    const t = await createTournament(cookie, { suffix: "delete-active" });
    const { status, data } = await permanentDelete(cookie, { ids: [t.id] });
    assert("E-03 delete active → 200", status === 200);
    assert("E-03 count = 0 (not trashed)", data?.count === 0);

    // Tournament should still exist in admin list
    const adminList = await getAdminList(cookie);
    assert(
      "E-03 still exists",
      adminList.some((x) => x.id === t.id),
    );
  }

  // E-04: Trash a tournament with registrations, then check cascade on permanent delete
  {
    const t = await createTournament(cookie, {
      suffix: "with-reg",
      maxPlayers: 8,
    });
    // Register a player
    await registerForTournament(t.id, `reg-test-${Date.now()}@example.com`);
    await trash(cookie, [t.id]);

    const trashList = await getTrashList(cookie);
    const found = trashList.find((x) => x.id === t.id);
    assert("E-04 in trash with registrations", found != null);
    assert("E-04 has 1 registration", found?._count?.registrations === 1);

    // Permanent delete
    const { status } = await permanentDelete(cookie, { ids: [t.id] });
    assert("E-04 permanent delete → 200", status === 200);

    // Should be fully gone
    const trashAfter = await getTrashList(cookie);
    assert("E-04 gone from trash", !trashAfter.some((x) => x.id === t.id));
  }

  // E-05: Trash with mix of valid and non-existent IDs
  {
    const t = await createTournament(cookie, { suffix: "mix-ids" });
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { status, data } = await trash(cookie, [t.id, fakeId]);
    assert("E-05 trash with fake id → 200", status === 200);
    // count returns the number of ids submitted, not rows affected
    assert("E-05 count = 2", data?.count === 2);

    // Only the real one should be in trash
    const trashList = await getTrashList(cookie);
    assert(
      "E-05 real one in trash",
      trashList.some((x) => x.id === t.id),
    );
    assert(
      "E-05 fake one not in trash",
      !trashList.some((x) => x.id === fakeId),
    );
  }

  // E-06: Permanent delete with all:true when trash is empty
  {
    // Make sure trash is empty first
    await permanentDelete(cookie, { all: true });
    const { status, data } = await permanentDelete(cookie, { all: true });
    assert("E-06 clear all on empty → 200", status === 200);
    assert("E-06 count = 0", data?.count === 0);
  }

  // E-07: Trash many tournaments at once (bulk stress)
  {
    const many = [];
    for (let i = 0; i < 10; i++) {
      const t = await createTournament(cookie, { suffix: `bulk-${i}` });
      many.push(t.id);
    }
    const { status, data } = await trash(cookie, many);
    assert("E-07 trash 10 → 200", status === 200);
    assert("E-07 count = 10", data?.count === 10);

    const trashList = await getTrashList(cookie);
    const allInTrash = many.every((id) => trashList.some((t) => t.id === id));
    assert("E-07 all 10 in trash", allInTrash);

    // Clean up
    await permanentDelete(cookie, { ids: many });
  }

  // ════════════════════════════════════════════════════════════════════
  // ILLEGAL / INVALID INPUTS
  // ════════════════════════════════════════════════════════════════════
  section("Illegal / Invalid Inputs");

  // I-01: Trash with empty ids array
  {
    const { status, data } = await trash(cookie, []);
    assert("I-01 empty ids → 400", status === 400);
    assert(
      "I-01 error = 請選擇至少一場賽事",
      data?.error === "請選擇至少一場賽事",
    );
  }

  // I-02: Trash with missing ids field
  {
    const { status, data } = await trash(cookie, {});
    assert("I-02 missing ids → 400", status === 400);
    assert(
      "I-02 error = 請選擇至少一場賽事",
      data?.error === "請選擇至少一場賽事",
    );
  }

  // I-03: Trash with malformed JSON
  {
    const res = await fetch(`${BASE}/api/admin/tournaments/trash`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: "{bad json",
    });
    assert("I-03 malformed JSON → 400", res.status === 400);
    const data = await res.json();
    assert("I-03 error = 請求格式錯誤", data?.error === "請求格式錯誤");
  }

  // I-04: Restore with empty ids
  {
    const { status, data } = await restore(cookie, []);
    assert("I-04 restore empty → 400", status === 400);
    assert(
      "I-04 error = 請選擇至少一場賽事",
      data?.error === "請選擇至少一場賽事",
    );
  }

  // I-05: Restore with malformed JSON
  {
    const res = await fetch(`${BASE}/api/admin/tournaments/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: "{bad json",
    });
    assert("I-05 restore malformed → 400", res.status === 400);
  }

  // I-06: Delete with empty ids and no all flag
  {
    const { status, data } = await permanentDelete(cookie, { ids: [] });
    assert("I-06 delete empty ids → 400", status === 400);
    assert(
      "I-06 error = 請選擇至少一場賽事",
      data?.error === "請選擇至少一場賽事",
    );
  }

  // I-07: Delete with malformed JSON
  {
    const res = await fetch(`${BASE}/api/admin/tournaments/bin`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: "{bad json",
    });
    assert("I-07 delete malformed → 400", res.status === 400);
  }

  // I-08: Trash with ids containing falsy values (empty strings, null)
  {
    const { status } = await trash(cookie, ["", null, undefined, 0]);
    assert("I-08 falsy ids filtered → 400", status === 400);
  }

  // I-09: Trash endpoint requires admin auth
  {
    const { status } = await api("POST", "/api/admin/tournaments/trash", {
      ids: [t1.id],
    });
    assert("I-09 no auth → 401", status === 401);
  }

  // I-10: Restore endpoint requires admin auth
  {
    const { status } = await api("POST", "/api/admin/tournaments/restore", {
      ids: [t1.id],
    });
    assert("I-10 no auth → 401", status === 401);
  }

  // I-11: Bin endpoint requires admin auth
  {
    const { status } = await api("DELETE", "/api/admin/tournaments/bin", {
      ids: [t1.id],
    });
    assert("I-11 no auth → 401", status === 401);
  }

  // I-12: Trash GET requires admin auth
  {
    const { status } = await api("GET", "/api/admin/tournaments/trash");
    assert("I-12 trash GET no auth → 401", status === 401);
  }

  // ════════════════════════════════════════════════════════════════════
  // OTHER LIKELY USER BEHAVIORS
  // ════════════════════════════════════════════════════════════════════
  section("Other Likely User Behaviors");

  // U-01: Trash → restore → trash again (lifecycle round-trip)
  {
    const t = await createTournament(cookie, { suffix: "lifecycle" });
    await trash(cookie, [t.id]);
    await restore(cookie, [t.id]);
    await trash(cookie, [t.id]);

    const trashList = await getTrashList(cookie);
    assert(
      "U-01 in trash after re-trash",
      trashList.some((x) => x.id === t.id),
    );

    const adminList = await getAdminList(cookie);
    assert("U-01 hidden from admin", !adminList.some((x) => x.id === t.id));
  }

  // U-02: Restore tournament that was never trashed
  {
    const t = await createTournament(cookie, { suffix: "never-trashed" });
    const { status } = await restore(cookie, [t.id]);
    assert("U-02 restore non-trashed → 200", status === 200);

    const adminList = await getAdminList(cookie);
    assert(
      "U-02 still in admin list",
      adminList.some((x) => x.id === t.id),
    );
  }

  // U-03: Trash list ordering (most recently deleted first)
  {
    const tA = await createTournament(cookie, { suffix: "order-a" });
    const tB = await createTournament(cookie, { suffix: "order-b" });
    await trash(cookie, [tA.id]);
    // Small delay so deletedAt timestamps differ
    await new Promise((r) => setTimeout(r, 100));
    await trash(cookie, [tB.id]);

    const trashList = await getTrashList(cookie);
    const idxA = trashList.findIndex((t) => t.id === tA.id);
    const idxB = trashList.findIndex((t) => t.id === tB.id);
    assert("U-03 both in trash", idxA >= 0 && idxB >= 0);
    assert(
      "U-03 B (newer) before A",
      idxB < idxA,
      `idxA=${idxA}, idxB=${idxB}`,
    );
  }

  // U-04: Trash a CANCELLED tournament, then permanent delete
  {
    const t = await createTournament(cookie, { suffix: "cancelled" });
    // Cancel it first
    await api(
      "PATCH",
      `/api/admin/tournaments/${t.id}`,
      { status: "CANCELLED" },
      cookie,
    );
    await trash(cookie, [t.id]);

    const trashList = await getTrashList(cookie);
    const found = trashList.find((x) => x.id === t.id);
    assert("U-04 cancelled in trash", found != null);
    assert("U-04 status = CANCELLED", found?.status === "CANCELLED");

    const { status } = await permanentDelete(cookie, { ids: [t.id] });
    assert("U-04 permanent delete cancelled → 200", status === 200);
  }

  // U-05: Trash a COMPLETED tournament
  {
    const t = await createTournament(cookie, { suffix: "completed" });
    await trash(cookie, [t.id]);

    const trashList = await getTrashList(cookie);
    assert(
      "U-05 completed in trash",
      trashList.some((x) => x.id === t.id),
    );
  }

  // U-06: Register for a restored tournament (should work if still OPEN)
  {
    const t = await createTournament(cookie, {
      suffix: "restore-register",
      maxPlayers: 8,
    });
    await trash(cookie, [t.id]);
    await restore(cookie, [t.id]);

    const { status } = await registerForTournament(
      t.id,
      `restore-${Date.now()}@example.com`,
    );
    assert("U-06 register after restore → 201", status === 201);
  }

  // U-07: Check public API doesn't return trashed tournaments
  {
    const t = await createTournament(cookie, { suffix: "public-check" });
    await trash(cookie, [t.id]);

    const publicList = await getPublicList();
    assert(
      "U-07 trashed not in public API",
      !publicList.some((x) => x.id === t.id),
    );
  }

  // U-08: Clear all (all:true) only deletes trashed, leaves active intact
  {
    const tActive = await createTournament(cookie, {
      suffix: "active-survive",
    });
    const tTrashed = await createTournament(cookie, {
      suffix: "trashed-clear",
    });
    await trash(cookie, [tTrashed.id]);

    await permanentDelete(cookie, { all: true });

    const adminList = await getAdminList(cookie);
    assert(
      "U-08 active survives clear-all",
      adminList.some((x) => x.id === tActive.id),
    );
    const trashList = await getTrashList(cookie);
    assert(
      "U-08 trashed is gone",
      !trashList.some((x) => x.id === tTrashed.id),
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ════════════════════════════════════════════════════════════════════
  section("Cleanup");

  // Permanent delete everything trashed
  await permanentDelete(cookie, { all: true });

  // Delete any remaining test tournaments from admin list
  const remaining = await getAdminList(cookie);
  const testRemaining = remaining.filter(
    (t) => allTitles.includes(t.title) || t.title?.startsWith(PREFIX),
  );

  if (testRemaining.length > 0) {
    // Trash then delete them
    await trash(
      cookie,
      testRemaining.map((t) => t.id),
    );
    await permanentDelete(cookie, { all: true });
    console.log(
      `  Cleaned up ${testRemaining.length} remaining test tournaments`,
    );
  }

  // Verify cleanup
  const finalTrash = await getTrashList(cookie);
  const leftover = finalTrash.filter((t) => t.title?.startsWith(PREFIX));
  assert("Cleanup: no test data in trash", leftover.length === 0);

  // ── Summary ─────────────────────────────────────────────────────────
  console.log("\n═════════════════════════════════════════════");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  ❌ ${f}`);
    }
  }
  console.log("═════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\n✗ Test runner crashed:", e);
  process.exit(1);
});
