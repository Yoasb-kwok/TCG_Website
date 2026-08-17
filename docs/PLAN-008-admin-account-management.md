# PLAN-008: Admin Account Management System Implementation Plan

**ADR:** [ADR-008: Admin Account Management System](./ADR-008-admin-account-management.md)
**Branch:** current working branch
**Created:** 2026-08-17

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
- Create a manual `prisma/migrations/rollback/` SQL script that reverses each change.

### 3. Enforce Static Checks
- `npm run lint`, `npm run type-check`, and `npm run test` must pass at each sub-task boundary and before every commit.
- Print terminal output as proof. Do not assume they pass.
- **Lint scope:** the bar is *no new errors or warnings introduced*. Baseline recorded below is out of scope — do not fix pre-existing failures.

---

## HARD RULES FOR THE IMPLEMENTING AGENT

1. **SPEC LOCK**: You cannot change this plan or the ADR-008 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: Target a maximum of **3 files edited per sub-task**; break larger tasks down. Exceeding 3 requires explicit user approval *before* the edit, naming the files and the reason.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after every sub-task. You MUST print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-tasks #4, #7, and #10, re-read ADR-008 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize the E2E smoke test (Sub-task 9). If it passes, the core logic is solid.

---

## Conventions Detected in This Repo

- **Migrations**: `prisma migrate deploy` fails (P3005). Use manual runner scripts (`prisma/run-migration-<feature>.ts` via `pg.Pool`), one per migration, idempotent.
- **Client regen**: after schema changes run `npx prisma generate` AND bump `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts` (stale client causes `undefined (reading 'create')` errors).
- **Prisma access**: `const prisma = getPrisma()` from `@/lib/prisma` — never `import { prisma }`.
- **Admin API auth**: `requireAdmin()` from `@/lib/auth-server` on every admin route.
- **Static-check baseline (2026-08-17)**: lint = 54 problems (36 errors, 18 warnings) pre-existing; type-check = 0 errors; vitest = 216/216 passing. Bar: no NEW lint findings.
- **OTP reuse**: `src/lib/otp.ts` (6-digit, bcrypt, 10-min expiry, 5 attempts). Email via `src/lib/email.ts`. **Never send test email to `yoasb.kwok@gmail.com`** (supervisor). Use `asdfghjklqaqlol@gmail.com`.
- **E2E admin login**: `admin@trtcg.hk` / `123456`.
- **API error handling**: wrap DB calls in try-catch returning `{ error }` JSON; client checks `res.ok` before `res.json()` (prevents the recurring `JSON.parse` error).

---

## Sub-Task Overview

| # | Sub-Task | Files | Dependency |
|---|----------|-------|------------|
| 1 | Prisma schema: `EmailChangeRequest` + `User.deletedAt` + rollback | schema.prisma, up SQL, rollback SQL | — |
| 2 | Migration runner + apply + client regen | run-migration-accounts.ts, src/lib/prisma.ts | #1 |
| 3 | Domain layer: accounts lib (TDD) | src/lib/accounts.ts + test | #2 |
| 4 | Admin API 1: list + edit + soft delete/undelete | 2 route files | #3 |
| 5 | Admin API 2: email-change initiate/reverse | 2 route files | #3 |
| 6 | Admin API 3: send-reset + CSV export + forgot-password block | 3 route files | #3 |
| 7 | User-side: OTP endpoints + verify page + auth/middleware wall | 4 route/page/config files | #3 |
| 8 | Admin UI: page + manager + sidebar + transactions prefill | 4 UI files | #4–#6 |
| 9 | E2E smoke test | e2e/accounts.spec.ts | #3–#8 |
| 10 | Deliverables: PROGRESS + PR description | docs | #9 |

> Sub-tasks 7 and 8 need 4 files each — pre-approved deviation from the 3-file guideline (verified necessary during planning; each file is a distinct route/page/config concern that cannot be merged without breaking conventions). Flag to user if scope grows further.

---

## Sub-Task 1: Prisma Schema — EmailChangeRequest + User.deletedAt

**Files (3):**
1. `prisma/schema.prisma` — add `EmailChangeRequest` model + `deletedAt DateTime?` on `User`.
2. `prisma/migrations/20260817000000_accounts/migration.sql` — up migration.
3. `prisma/migrations/rollback/rollback-accounts.sql` — down migration (**write first**).

### Schema

```prisma
model User {
  // ... existing fields ...
  /// ADR-008 Decision 7: soft delete
  deletedAt DateTime?
}

/// ADR-008 Decision 2: admin-initiated email change transition record
model EmailChangeRequest {
  id          String    @id @default(uuid())
  userId      String    @unique
  oldEmail    String
  newEmail    String
  otpHash     String?
  attempts    Int       @default(0)
  expiresAt   DateTime?
  /// PENDING → CONFIRMED | REVERSED
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  confirmedAt DateTime?

  @@index([userId])
  @@index([status])
}
```

### Rollback SQL (write BEFORE up migration)

```sql
DROP TABLE IF EXISTS "EmailChangeRequest";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedAt";
```

### Verification
- `npx prisma validate` passes.
- `npx prisma generate` succeeds (schema-level only; DB apply in Sub-task 2).
- `npm run type-check` passes.

---

## Sub-Task 2: Migration Runner + Apply + Client Regen

**Files (2):**
1. `prisma/run-migration-accounts.ts` — idempotent manual runner (`pg.Pool`, checks table/column existence first).
2. `src/lib/prisma.ts` — bump `PRISMA_SCHEMA_VERSION` to `"20260817000000_accounts"`.

### Steps
1. Write runner following `run-migration-coupon.ts` pattern.
2. Run `npx tsx prisma/run-migration-accounts.ts` (local DB).
3. Bump `PRISMA_SCHEMA_VERSION`.
4. `npx prisma generate` + `npm run type-check`.

### Verification
- `EmailChangeRequest` table + `User.deletedAt` column exist locally.
- Tests still pass (`npm run test`).

---

## Sub-Task 3: Domain Layer — `src/lib/accounts.ts` (TDD)

**Files (2):**
1. `src/lib/__tests__/accounts.test.ts` — written FIRST, must fail.
2. `src/lib/accounts.ts` — domain functions.

### Domain Functions

```typescript
// Search & listing
export async function listAccounts(opts: {
  q?: string;              // matches id, name, email, phone (contains, case-insensitive)
  sort?: "newest" | "oldest";
  includeDeleted?: boolean;
}): Promise<AccountRow[]>;  // + pendingEmailChange flag per row

// Profile edit
export async function updateProfile(id: string, input: { name?: string; phone?: string }): Promise<User>;

// Email change state machine (ADR-008 Decisions 2–5)
export async function initiateEmailChange(userId: string, newEmail: string): Promise<EmailChangeRequest>;
//   - rejects: user not found / deleted; new email normalized+in use (any User); pending already exists
//   - flips User.email → newEmail, stores oldEmail in request (PENDING)

export async function reverseEmailChange(userId: string): Promise<User>;
//   - only if PENDING; restores User.email = oldEmail; status = REVERSED

export async function requestEmailChangeOtp(userId: string): Promise<void>;
//   - only if PENDING; reuse otp.ts constants; regenerate if absent/expired; respects attempts

export async function verifyEmailChangeOtp(userId: string, code: string): Promise<User>;
//   - correct → transaction: status CONFIRMED + UPDATE PointLedger email old→new
//   - wrong → attempts++; expired → error; attempts ≥ 5 → locked (admin reverse is recovery)

export async function hasPendingEmailChange(email: string): Promise<boolean>;
//   - used by forgot-password block (Decision 3)

// Soft delete (Decision 7)
export async function softDeleteAccount(userId: string): Promise<User>;
export async function undeleteAccount(userId: string): Promise<User>;

// CSV (Decision 8) — columns: id, name, email, phone, createdAt
export async function exportAccountsCsv(ids: string[]): Promise<string>;
```

### Test Cases (must fail initially)

```
describe("initiateEmailChange")
  ✓ flips User.email to new email and stores oldEmail in PENDING request
  ✓ rejects when new email is already registered
  ✓ rejects when a PENDING request already exists
  ✓ rejects when user is soft-deleted

describe("reverseEmailChange")
  ✓ restores old email and marks REVERSED (only when PENDING)
  ✓ throws when no PENDING request

describe("requestEmailChangeOtp")
  ✓ generates OTP only for PENDING requests
  ✓ reuses unexpired OTP (does not reset attempts)

describe("verifyEmailChangeOtp")
  ✓ on success: CONFIRMED + PointLedger rows moved old→new email
  ✓ on wrong code: attempts increments
  ✓ after 5 wrong attempts: locked, throws
  ✓ on expired OTP: throws

describe("hasPendingEmailChange")
  ✓ true for pending, false for confirmed/reversed/none

describe("softDeleteAccount / undeleteAccount")
  ✓ sets/clears deletedAt
  ✓ listAccounts hides deleted by default, shows with includeDeleted

describe("listAccounts")
  ✓ q matches id, name, email, phone
  ✓ sort newest/oldest by createdAt
```

> Domain tests hit a real DB (`DATABASE_URL`) — same pattern as existing `__tests__` suites. If unit-DB tests prove impractical for stateful Prisma work, fall back to integration-style tests against the local DB with cleanup, and note it in PROGRESS.

### Verification
- `npm run test` — accounts suite red first, then green.
- `npm run lint`, `npm run type-check` — no new findings.

---

## Sub-Task 4: Admin API 1 — List + Edit + Soft Delete/Undelete

> ⚠️ **CONTEXT REFRESH:** Before starting, re-read ADR-008 + this plan; summarize progress to the user.

**Files (2):**
1. `src/app/api/admin/accounts/route.ts` — `GET` (list: `?q=&sort=&includeDeleted=`).
2. `src/app/api/admin/accounts/[id]/route.ts` — `PATCH` (`{ name?, phone?, deletedAt?: null }` handles edit + undelete), `DELETE` (soft delete).

All routes: `requireAdmin()`, try-catch → `{ error }` JSON, no HTML error pages.

### Verification
- `npm run type-check`, lint, tests pass.
- Manual curl of GET returns `[]` or account list JSON.

---

## Sub-Task 5: Admin API 2 — Email-Change Initiate + Reverse

**Files (2):**
1. `src/app/api/admin/accounts/[id]/email-change/route.ts` — `POST` `{ newEmail }` (state 1).
2. `src/app/api/admin/accounts/[id]/email-change/reverse/route.ts` — `POST` (reverse).

Errors mapped: 404 user missing, 409 email-in-use / pending-exists, 400 invalid.

### Verification
- Type-check, lint, tests. Manual: initiate on test account flips email; reverse restores.

---

## Sub-Task 6: Admin API 3 — Send-Reset + CSV Export + Forgot-Password Block

**Files (3):**
1. `src/app/api/admin/accounts/[id]/send-reset/route.ts` — admin-triggered password reset; **409 when pending email change** (Decision 3); reuses `forgot-password` server logic.
2. `src/app/api/admin/accounts/export/route.ts` — `POST { ids: string[] }` → CSV (text/csv, BOM for Excel zh-TW).
3. `src/app/api/auth/forgot-password/route.ts` — **modify**: return 409 if `hasPendingEmailChange(email)` (Decision 3).

### Verification
- Type-check, lint, tests. Manual: send-reset on pending account → 409.

---

## Sub-Task 7: User-Side — OTP Endpoints + Verify Page + Login Wall

**Files (4 — pre-approved deviation):**
1. `src/app/api/auth/email-change/request-otp/route.ts` — authenticated user POST → sends OTP to new email (state 2 trigger).
2. `src/app/api/auth/email-change/verify/route.ts` — authenticated user POST `{ code }` → state 3.
3. `src/app/verify-email-change/page.tsx` — blocking interstitial: requests OTP on load, 6-digit input, verify/resend, sign-out option.
4. `src/auth.ts` + `src/auth.config.ts` + `src/middleware.ts` — (a) `authorize` rejects soft-deleted users; (b) JWT gains `emailChangePending` flag set when a PENDING request exists at login; (c) middleware redirects any authenticated navigation to `/verify-email-change` while flag set (hard wall, Decision 4). Public/auth routes exempt.

> If (4) cannot fit the file guideline even split, pause and ask — do not improvise the wall mechanism.

### Verification
- Type-check, lint, tests.
- Manual: initiate change on test account → login with new email → lands on OTP wall → verify → normal session; wrong path blocked.

---

## Sub-Task 8: Admin UI — Accounts Dashboard

> ⚠️ **CONTEXT REFRESH:** Before starting, re-read ADR-008 + this plan; summarize progress to the user.

**Files (4 — pre-approved deviation):**
1. `src/app/admin/(panel)/accounts/page.tsx` — shell rendering `<AccountsManager />`.
2. `src/components/admin/accounts-manager.tsx` — table (id, name, email, phone, join date, status badges: deleted/pending-change), single search box, date sort, checkbox multi-select + CSV button (right of search), per-row actions: detail/edit window (name, phone edit; email-change initiate + reverse buttons; send password reset), soft delete (warning) + un-delete (filter to reveal deleted), "view transactions" link → `/admin/transactions?email=<account email>`. Loading states; `res.ok` checks everywhere.
3. `src/components/admin/admin-sidebar.tsx` — "帳戶管理" item (`Users` icon).
4. `src/components/admin/transactions-manager.tsx` — **modify**: read `?email=` query param on mount → prefill search (ADR-008 Decision 8 cross-feature dependency).

### Verification
- Type-check, lint. Dev-server manual pass of every action.

---

## Sub-Task 9: E2E Smoke Test

**Files (1):**
1. `e2e/accounts.spec.ts`

### Test Flow
```
1. Admin session (existing setAdminAuth helper pattern)
2. Mock GET /api/admin/accounts → two accounts (one pending change, one deleted)
3. /admin/accounts renders rows, search box, sort, CSV button
4. Search filters rows; deleted account hidden by default, visible via filter
5. Edit window opens; initiate email-change posts and reflects pending state
6. (Domain-level state machine covered by unit suite — E2E stays on the dashboard happy path)
```

### Verification
- `npx playwright test e2e/accounts.spec.ts` passes; full E2E suite unaffected.

---

## Sub-Task 10: Deliverables — PROGRESS + PR Description

> ⚠️ **CONTEXT REFRESH:** Before starting, re-read ADR-008 + this plan; summarize progress to the user.

**Files (1+):**
1. `docs/PROGRESS-accounts.md` — final-vs-plan table, discrepancies with approvals, tests added, tech debt, manual smoke steps, deploy notes.
2. PR description drafted in PROGRESS (same file, per PLAN-007 convention).

### Deploy Notes (must land in PROGRESS)
- Production migration: `npx tsx prisma/run-migration-accounts.ts` (both Supabase and Neon if both live).
- No new env vars.
- Rollback: `prisma/migrations/rollback/rollback-accounts.sql`.

---

## Manual Smoke Test Steps (for the human)

1. `/admin/accounts` → list renders; search by name/email/phone/id.
2. Sort newest/oldest toggles order.
3. Edit window: change name/phone → saved.
4. Email change on test account → old email login fails; new email + password → OTP wall → code (check test inbox) → normal session; admin sees request CONFIRMED; points moved (check points dashboard).
5. Reverse button during pending → email restored, user logs in with old email again.
6. Send password reset (no pending) → email arrives; with pending → error shown.
7. Delete account (warning) → hidden; filter reveals → un-delete works.
8. Select rows → CSV downloads with id,name,email,phone,createdAt.
9. "View transactions" → transactions dashboard prefilled with that email.
