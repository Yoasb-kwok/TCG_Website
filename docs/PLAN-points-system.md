# Implementation Plan: Points / Loyalty System (ADR-004)

> **Reference:** `docs/ADR-004-points-system.md`
> **Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`

---

## Overview

Build an email-keyed, ledger-only points system. Customers earn 1 point per HKD 1 spent (subtotal only) on products and tournaments. Admins can adjust points with a required reason. Guests accumulate points keyed by email; registering "unlocks" them.

**Key principle:** Email is the universal identity — not `userId`. Points exist regardless of whether the buyer has an account.

---

## Mandatory Actions BEFORE Writing Feature Code

These rules apply to **every sub-task** in this plan.

### 1. Write Failing Tests First (TDD)
- Write unit/integration tests (Vitest) that precisely describe the expected behavior of the new feature.
- These tests **must fail** initially (red).
- Write the minimum code to make them pass (green).
- Then refactor.

### 2. Create Rollback Scripts
- If the sub-task involves database schema changes (Prisma migrations), generate the **"down" migration** (rollback script) *before* writing the feature logic.
- Prisma doesn't have native down migrations — create a manual SQL script that reverses each change.

### 3. Enforce Static Checks
- `npm run lint`, `npm run type-check`, and `npm run test` must pass after every file save.
- Print terminal output as proof. Do not assume they pass.

---

## HARD RULES FOR THE IMPLEMENTING AGENT

1. **SPEC LOCK**: You cannot change this plan or the ADR-004 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: You are restricted to editing a maximum of **3 files per sub-task**. Break larger tasks down.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after EVERY file save. You must print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-task #4, #7, and #10, re-read ADR-004 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize writing 1 end-to-end (E2E) smoke test (Playwright) for the main user flow. If the E2E passes, the core logic is solid.

---

## Existing Codebase Context

| Component | Path | Notes |
|-----------|------|-------|
| Prisma schema | `prisma/schema.prisma` | `OrderStatus` enum; `Order`, `User`, `TournamentRegistration` models |
| Prisma client | `src/lib/prisma.ts` | `getPrisma()`, `isDatabaseConfigured()`. Uses `@/generated/prisma/client`. Bump `PRISMA_SCHEMA_VERSION` after schema change. |
| Auth server | `src/lib/auth-server.ts` | `requireAdmin()` returns `{ ok: true, session } \| { ok: false, response }` |
| Auth | `src/auth.ts` | NextAuth v5, JWT strategy, `auth()` function |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` | Handles `checkout.session.completed` — marks order PAID, sends receipt, creates Transaction (ADR-003) |
| Admin orders PATCH | `src/app/api/admin/orders/[id]/route.ts` | Updates order status (manual PAID trigger) |
| Admin orders UI | `src/app/admin/(panel)/orders/page.tsx` | Status dropdown calls PATCH |
| Admin sidebar | `src/components/admin/admin-sidebar.tsx` | 7 nav items including "交易管理" |
| User menu (header) | `src/components/layout/user-menu.tsx` | Uses `useSession()`, shows username + admin link |
| Tournament register API | `src/app/api/tournaments/register/route.ts` | Creates TournamentRegistration + Stripe session |
| Transaction service | `src/lib/transactions.ts` | `createOrderTransaction()`, `createTournamentTransaction()` (called from webhook) |
| Email service | `src/lib/email.ts` | Gmail SMTP via nodemailer |

### Migration Pattern
- `prisma migrate deploy` FAILS with P3005 ("database schema is not empty")
- Always use manual SQL via `pg.Pool` script (see `prisma/run-migration-transaction.ts` for pattern)
- After schema change: run `npx prisma generate` + bump `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts`

---

## Sub-tasks

### Sub-task 0: Schema — PointLedger Model + PointReason Enum + Rollback Script

**ADR Decisions:** 1 (Ledger-only, email-keyed), 2 (Integer points)

**Files (3):**
1. `prisma/schema.prisma` — Add `PointReason` enum + `PointLedger` model
2. `prisma/migrations/20260813120000_point_ledger/migration.sql` — Forward migration
3. `prisma/migrations/20260813120000_point_ledger/rollback.sql` — Rollback script

**Schema to add:**

```prisma
enum PointReason {
  ORDER_EARN
  TOURNAMENT_EARN
  ADMIN_ADJUST
}

model PointLedger {
  id          String      @id @default(uuid())
  email       String
  delta       Int
  reason      PointReason
  referenceId String?
  note        String?
  createdAt   DateTime    @default(now())

  @@index([email])
  @@index([email, createdAt])
  @@index([referenceId, reason])
}
```

**Migration SQL** (from ADR-004):

```sql
CREATE TYPE "PointReason" AS ENUM ('ORDER_EARN', 'TOURNAMENT_EARN', 'ADMIN_ADJUST');

CREATE TABLE "PointLedger" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" "PointReason" NOT NULL,
  "referenceId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PointLedger_email_idx" ON "PointLedger"("email");
CREATE INDEX "PointLedger_email_createdAt_idx" ON "PointLedger"("email", "createdAt");
CREATE INDEX "PointLedger_referenceId_reason_idx" ON "PointLedger"("referenceId", "reason");
```

**Rollback SQL:**

```sql
DROP INDEX IF EXISTS "PointLedger_referenceId_reason_idx";
DROP INDEX IF EXISTS "PointLedger_email_createdAt_idx";
DROP INDEX IF EXISTS "PointLedger_email_idx";
DROP TABLE IF EXISTS "PointLedger";
DROP TYPE IF EXISTS "PointReason";
```

**Actions:**
1. Add schema to `prisma/schema.prisma`
2. Write migration + rollback SQL
3. Run `npx prisma generate`
4. Bump `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts` to `"20260813120000_point_ledger"`
5. Run migration SQL via `pg.Pool` script (follow `prisma/run-migration-transaction.ts` pattern)
6. Verify: `npm run type-check` passes

**Done when:** Schema compiles, Prisma client regenerated, migration applied to local DB, rollback script exists.

---

### Sub-task 1: Domain Service — `src/lib/points.ts` (TDD)

**ADR Decisions:** 2 (Integer, 1pt/$1), 3 (Subtotal only), 4 (Service module), 5 (Idempotency guard), 7 (Admin absolute set + reason), 10 (Floor at 0)

**Files (2):**
1. `src/lib/__tests__/points.test.ts` — Unit tests (write FIRST)
2. `src/lib/points.ts` — Service module

**Write tests first (RED):**

```
awardOrderPoints(email, orderId, subtotal):
  ✓ awards Math.floor(subtotal) points for positive subtotal
  ✓ does nothing for $0 subtotal
  ✓ does nothing for negative subtotal
  ✓ skips if ORDER_EARN entry already exists for that orderId (idempotency)
  ✓ creates ledger row with email, delta, reason=ORDER_EARN, referenceId=orderId

awardTournamentPoints(email, registrationId, entryFee):
  ✓ awards Math.floor(entryFee) points for positive entryFee
  ✓ does nothing for $0 entryFee (free tournament)
  ✓ skips if TOURNAMENT_EARN entry already exists for that registrationId
  ✓ creates ledger row with reason=TOURNAMENT_EARN

getPointsBalance(email):
  ✓ returns SUM(delta) for that email
  ✓ returns 0 when no ledger entries exist
  ✓ floors at 0 (Math.max(0, sum)) — negative raw sum returns 0

adminSetPoints(email, target, note, adminId):
  ✓ sets balance to target by inserting delta = target - current
  ✓ clamps target to Math.max(0, target)
  ✓ does nothing if delta is 0 (already at target)
  ✓ requires note field (rejects empty note)
  ✓ creates ledger row with reason=ADMIN_ADJUST, referenceId=adminId
```

**Implementation (GREEN):**

```ts
// src/lib/points.ts
import { getPrisma } from "@/lib/prisma";

/** ADR-004 Decision 2: 1 point per HKD 1, Math.floor */
export const POINTS_RATE = 1;

export async function awardOrderPoints(
  email: string, orderId: string, subtotal: number,
): Promise<void> {
  const points = Math.floor(subtotal * POINTS_RATE);
  if (points <= 0) return;
  const existing = await getPrisma().pointLedger.findFirst({
    where: { referenceId: orderId, reason: "ORDER_EARN" },
  });
  if (existing) return;
  await getPrisma().pointLedger.create({
    data: { email, delta: points, reason: "ORDER_EARN", referenceId: orderId },
  });
}

export async function awardTournamentPoints(
  email: string, registrationId: string, entryFee: number,
): Promise<void> {
  const points = Math.floor(entryFee * POINTS_RATE);
  if (points <= 0) return;
  const existing = await getPrisma().pointLedger.findFirst({
    where: { referenceId: registrationId, reason: "TOURNAMENT_EARN" },
  });
  if (existing) return;
  await getPrisma().pointLedger.create({
    data: { email, delta: points, reason: "TOURNAMENT_EARN", referenceId: registrationId },
  });
}

export async function getPointsBalance(email: string): Promise<number> {
  const result = await getPrisma().pointLedger.aggregate({
    where: { email },
    _sum: { delta: true },
  });
  return Math.max(0, result._sum.delta ?? 0);
}

export async function adminSetPoints(
  email: string, target: number, note: string, adminId: string,
): Promise<void> {
  if (!note.trim()) throw new Error("Reason required");
  const clampedTarget = Math.max(0, Math.floor(target));
  const current = await getPointsBalance(email);
  const delta = clampedTarget - current;
  if (delta === 0) return;
  await getPrisma().pointLedger.create({
    data: { email, delta, reason: "ADMIN_ADJUST", referenceId: adminId, note },
  });
}
```

**Mock pattern** (same as existing tests):

```ts
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));
```

**Done when:** All tests pass, `npm run type-check` passes.

---

### Sub-task 2: User Points API — `GET /api/user/points`

**ADR Decision:** 6 (Header display, client-side fetch)

**Files (2):**
1. `src/app/api/user/points/route.test.ts` — Tests (write FIRST)
2. `src/app/api/user/points/route.ts` — Endpoint

**Write tests first (RED):**

```
GET /api/user/points:
  ✓ returns { points: N } for authenticated user
  ✓ returns 401 for unauthenticated request
  ✓ returns 401 if session has no email
```

**Implementation (GREEN):**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPointsBalance } from "@/lib/points";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ points: 0 });
  }
  const balance = await getPointsBalance(session.user.email);
  return NextResponse.json({ points: balance });
}
```

**Mock pattern:**

```ts
vi.mock("@/lib/prisma", () => ({ getPrisma: vi.fn(), isDatabaseConfigured: vi.fn(() => true) }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/points", () => ({ getPointsBalance: vi.fn() }));
```

**Done when:** Tests pass, type-check passes.

---

### Sub-task 3: Admin Points API — `GET + PATCH /api/admin/points`

**ADR Decisions:** 7 (Absolute set + reason), 9 (Search name OR email), 11 (Rank by points)

**═════════════════════════════════════════════════════**
**⚡ CONTEXT REFRESH #1 — Before starting Sub-task 4**
**Re-read ADR-004. Summarize progress:**
- Schema done (PointLedger + PointReason)
- Domain service done (awardOrderPoints, awardTournamentPoints, getPointsBalance, adminSetPoints)
- User points API done (GET /api/user/points)
- Remaining: admin API, webhook integration, header display, admin dashboard, page indicators, E2E
**═════════════════════════════════════════════════════**

**Files (2):**
1. `src/app/api/admin/points/route.test.ts` — Tests (write FIRST)
2. `src/app/api/admin/points/route.ts` — GET (list) + PATCH (adjust)

**Write tests first (RED):**

```
GET /api/admin/points:
  ✓ returns aggregated list: email, name (LEFT JOIN User), type (USER/GUEST), balance, lastEarned
  ✓ supports search by email (case-insensitive)
  ✓ supports search by name (case-insensitive)
  ✓ supports type filter (USER / GUEST)
  ✓ supports sort by points (desc default)
  ✓ returns 401 for non-admin

PATCH /api/admin/points:
  ✓ adjusts points with reason note
  ✓ rejects empty reason
  ✓ rejects negative target (clamps to 0)
  ✓ returns 401 for non-admin
  ✓ returns updated balance
```

**GET implementation:**

Uses `prisma.$queryRaw` for the aggregation (GROUP BY email with LEFT JOIN to User):

```sql
SELECT
  p.email,
  COALESCE(SUM(p.delta), 0) AS balance,
  u.name,
  CASE WHEN u.id IS NOT NULL THEN 'USER' ELSE 'GUEST' END AS type,
  MAX(p."createdAt") AS "lastEarned"
FROM "PointLedger" p
LEFT JOIN "User" u ON u.email = p.email
WHERE (:search = '' OR u.name ILIKE '%' || :search || '%' OR p.email ILIKE '%' || :search || '%')
GROUP BY p.email, u.name, u.id
ORDER BY balance DESC
```

Filter by type after GROUP BY in TypeScript (since USER/GUEST is computed).

**PATCH implementation:**

```ts
const { email, target, note } = await request.json();
await adminSetPoints(email, target, note, session.user.id);
const balance = await getPointsBalance(email);
return NextResponse.json({ email, points: balance });
```

**Done when:** Tests pass, type-check passes.

---

### Sub-task 4: Webhook Integration — Award Points on Payment

**ADR Decisions:** 4 (Service module), 5 (Manual admin PAID also awards)

**Files (2):**
1. `src/app/api/webhooks/stripe/route.ts` — Add awardOrderPoints + awardTournamentPoints calls
2. `src/app/api/admin/orders/[id]/route.ts` — Add awardOrderPoints on manual PAID

**Changes to Stripe webhook** (`src/app/api/webhooks/stripe/route.ts`):

After the existing `createOrderTransaction(order.id)` call:

```ts
// ADR-004: Award loyalty points
const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
await awardOrderPoints(order.email, order.id, subtotal);
```

After the existing `createTournamentTransaction(registration.id)` call:

```ts
// ADR-004: Award loyalty points
await awardTournamentPoints(
  registration.email,
  registration.id,
  /* entryFee — need to fetch tournament */
);
```

Note: The webhook currently has `registration` but not the tournament's `entryFee`. Fetch it:

```ts
const tournament = await prisma.tournament.findUnique({
  where: { id: registration.tournamentId },
  select: { entryFee: true },
});
await awardTournamentPoints(registration.email, registration.id, tournament?.entryFee ?? 0);
```

**Changes to admin orders PATCH** (`src/app/api/admin/orders/[id]/route.ts`):

After the `order.update` call, if status changed to `PAID`:

```ts
if (status === "PAID") {
  const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  await awardOrderPoints(order.email, order.id, subtotal);
}
```

**Done when:** Webhook calls award functions, admin PATCH calls award on PAID, type-check passes, existing tests still pass.

---

### Sub-task 5: Header Display — Points Badge with Loading Animation

**ADR Decision:** 6 (Client-side fetch, loading skeleton)

**═════════════════════════════════════════════════════**
**⚡ CONTEXT REFRESH #2 — Before starting Sub-task 7**
**Re-read ADR-004. Summarize progress:**
- Schema, domain service, user API, admin API all done
- Webhook integration done
- Remaining: header badge, admin dashboard, page indicators, about page, sidebar, E2E
**═════════════════════════════════════════════════════**

**Files (1):**
1. `src/components/layout/user-menu.tsx` — Add points badge

**Changes:**

Add `useEffect` to fetch `/api/user/points` after session loads. Show loading skeleton while fetching, then show badge with points.

```tsx
const [points, setPoints] = useState<number | null>(null);
const [pointsLoading, setPointsLoading] = useState(true);

useEffect(() => {
  if (!session?.user) return;
  setPointsLoading(true);
  fetch("/api/user/points")
    .then((r) => r.json())
    .then((d) => setPoints(d.points))
    .finally(() => setPointsLoading(false));
}, [session?.user]);

// In render, between username and admin link:
{pointsLoading ? (
  <span className="h-5 w-12 animate-pulse rounded bg-muted" />
) : points !== null && points > 0 ? (
  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
    {points} 分
  </span>
) : null}
```

**Done when:** Header shows points badge for logged-in users with loading animation, type-check passes.

---

### Sub-task 6: Admin Sidebar — Add "積分管理" Nav Item

**Files (1):**
1. `src/components/admin/admin-sidebar.tsx` — Add nav entry

**Changes:**

Add to `LINKS` array:

```ts
{ href: "/admin/points", label: "積分管理", icon: Award },
```

Import `Award` from `lucide-react`.

**Done when:** Sidebar shows new link, type-check passes.

---

### Sub-task 7: Admin Points Dashboard — Table with Search, Filter, Sort, Edit

**ADR Decisions:** 7 (Edit dialog with absolute set + reason), 9 (Search name OR email), 10 (Floor at 0), 11 (Rank by points)

**═════════════════════════════════════════════════════**
**⚡ CONTEXT REFRESH #3 — Before starting Sub-task 10**
**Re-read ADR-004. Summarize progress:**
- All backend done (schema, service, APIs, webhook, admin orders)
- Header badge done, sidebar link done
- Remaining: admin dashboard UI, page indicators, about page, E2E, deliverables
**═════════════════════════════════════════════════════**

**Files (1):**
1. `src/app/admin/(panel)/points/page.tsx` — Full admin dashboard

**Features:**
- Table: Rank | Email | Name | Type (USER/GUEST) | Points | Last Earned | Actions
- Search box: matches name OR email
- Type filter dropdown: All / User / Guest
- Sort: Rank by points (default), also sortable by last earned
- Edit button → opens inline dialog:
  - Shows current balance
  - Input for new target balance
  - Required reason textarea
  - Shows computed delta (target - current)
  - Save / Cancel buttons
- Calls `GET /api/admin/points` for list
- Calls `PATCH /api/admin/points` for adjustment

**Done when:** Page renders, search/filter/sort work, edit dialog works, type-check passes.

---

### Sub-task 8: Page Indicators — "Earn N 分" on Product, Tournament, Checkout

**ADR Decision:** 8 (Context-aware for guests)

**Files (3 max per atomic constraint — split if needed):**

**8a (1 file):** Product detail page — add "Earn N 分" indicator
**8b (1 file):** Tournament registration page — add "Earn N 分" indicator
**8c (1 file):** Checkout page — add "You will earn N 分" indicator

For each:
- Calculate `Math.floor(price * POINTS_RATE)` client-side
- Import `POINTS_RATE` from `@/lib/points` (shared constant)
- If guest: add "— 註冊即可查看及使用積分" suffix

**Done when:** All three pages show points indicator, type-check passes.

---

### Sub-task 9: About Page — Points System Description

**ADR Decision:** 8 (Description shown on about page for reference)

**Files (1):**
1. `src/app/about/page.tsx` (or seed data) — Add points system section

**Content (Traditional Chinese):**

```
積分系統
每消費 HKD 1 即可獲得 1 積分。積分可用於未來的優惠及獎賞。
訪客消費亦會累積積分，註冊帳戶後即可查看及使用。
```

**Done when:** About page includes points description, type-check passes.

---

### Sub-task 10: E2E Smoke Test (Playwright)

**ADR Decision:** Integration-first rule

**Files (1):**
1. `e2e/points.spec.ts` — E2E test for admin dashboard flow

**Test flow:**

```
1. Set admin auth cookie (reuse e2e/auth-helpers.ts setAdminAuth)
2. Mock GET /api/admin/points → return 2 mock accounts
3. Navigate to /admin/points
4. Verify table renders with correct data
5. Test search filters results
6. Test type filter
7. Test edit dialog opens, requires reason, saves
```

Reuse the `setAdminAuth` helper from `e2e/auth-helpers.ts` (created for transaction tests).

**Done when:** All E2E tests pass.

---

### Sub-task 11: Deliverables — PROGRESS.md + PR Description

**Files (1):**
1. `PROGRESS-points.md` — Context-refresh summary

**PROGRESS-points.md contents:**
- Checklist of all 11 ADR-004 decisions — implemented as specified?
- Any deviations (with reason and user approval)
- Test results summary
- Migration instructions
- Manual smoke test steps

**PR Description:**

```markdown
## Points / Loyalty System (ADR-004)

### Files Changed
[List every file with one-line description]

### Tests Added
[List test files + count]

### Test Results
- Unit (Vitest): X/X passing
- E2E (Playwright): X/X passing
- Type check: ✅
- Lint: ✅

### Migration Required
- Run point ledger migration SQL on production DB
- Bump PRISMA_SCHEMA_VERSION

### Technical Debt
- [Any shortcuts or deferred items]

### Manual Test Steps
[See PROGRESS-points.md]
```

**Done when:** PROGRESS-points.md written, PR description output to terminal.

---

## Dependency Graph

```
Sub-task 0 (Schema)
    │
    ├── Sub-task 1 (Domain Service) ──┐
    │                                 │
    ├── Sub-task 2 (User API)         ├── Sub-task 4 (Webhook Integration)
    │                                 │
    └── Sub-task 3 (Admin API)        │
                                      │
                                      ├── Sub-task 5 (Header Badge)
                                      ├── Sub-task 6 (Sidebar)
                                      ├── Sub-task 7 (Admin Dashboard)
                                      ├── Sub-task 8 (Page Indicators)
                                      └── Sub-task 9 (About Page)
                                              │
                                              └── Sub-task 10 (E2E)
                                                      │
                                                      └── Sub-task 11 (Deliverables)
```

---

## Migration & Deployment Checklist

- [ ] Run `npx prisma generate` after schema change
- [ ] Bump `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts`
- [ ] Run migration SQL on local DB (via `pg.Pool` script)
- [ ] Run migration SQL on Vercel DB (via Supabase SQL Editor or script with Vercel's `DATABASE_URL`)
- [ ] Verify Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) is set for webhook integration
- [ ] No new env vars needed for this feature

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Prisma client not regenerated after schema change | High (happened before) | Always run `npx prisma generate` + bump `PRISMA_SCHEMA_VERSION` |
| Webhook double-award (webhook retry + admin manual) | Medium | Idempotency guard in `awardOrderPoints` (checks existing ledger entry) |
| Admin dashboard query slow at scale | Low | Review trigger: >500ms at >1000 customers → add denormalized cache |
| Guest points display confusion | Low | Context-aware messaging (Decision 8) |
| Float precision in point calculation | Eliminated | Integer-only design (Decision 2) |

---

## Manual Smoke Test Steps

After implementation is complete:

1. **Header badge:** Log in as any user → verify points badge appears in header
2. **Product page:** Visit a product → verify "Earn N 分" indicator
3. **Tournament page:** Visit a tournament → verify "Earn N 分" indicator
4. **Checkout:** Add items to cart → go to checkout → verify "You will earn N 分"
5. **Purchase flow:** Complete a Stripe checkout → verify points appear in header after refresh
6. **Admin dashboard:** Go to /admin/points → verify table loads with correct data
7. **Admin search:** Type a name or email → verify results filter
8. **Admin filter:** Select USER or GUEST → verify results filter
9. **Admin edit:** Click edit on a row → set new balance + reason → save → verify balance updates
10. **Guest points:** Check out as guest → verify points appear on admin dashboard under guest email
11. **About page:** Visit /about → verify points system description is visible
