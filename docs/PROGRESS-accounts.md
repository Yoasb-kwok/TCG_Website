# PROGRESS: Admin Account Management System (PLAN-008)

**Date:** 2026-08-17
**ADR:** [ADR-008: Admin Account Management System](./ADR-008-admin-account-management.md)
**Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`

---

## Summary

Implemented the full admin account management system per ADR-008: dashboard with search/sort/CSV, profile editing, the 3-state email-change state machine with hard OTP wall, soft delete, admin-triggered password reset, and blocked self-service reset while a change is pending.

---

## What Was Built

### Sub-task 1-2: Schema + Migration
- [x] `EmailChangeRequest` model (id, userId unique, oldEmail, newEmail, otpHash, attempts, expiresAt, status PENDING/CONFIRMED/REVERSED, createdAt, confirmedAt)
- [x] `User.deletedAt DateTime?` (soft delete)
- [x] `prisma/migrations/20260817000000_accounts/migration.sql` + `rollback/rollback-accounts.sql` (rollback written first)
- [x] Runner `prisma/run-migration-accounts.ts` (idempotent, applied to local DB)
- [x] `PRISMA_SCHEMA_VERSION` bumped to `20260817000000_accounts`

### Sub-task 3: Domain layer (`src/lib/accounts.ts`, TDD)
- `listAccounts` (q search on id/name/email/phone, sort newest/oldest, includeDeleted flag, pendingEmailChange per row)
- `updateProfile`, `softDeleteAccount`, `undeleteAccount`
- `initiateEmailChange` (flips User.email at edit time; rejects in-use/pending/deleted)
- `reverseEmailChange` (PENDING only; restores old email)
- `issueEmailChangeOtp` / `verifyEmailChangeOtp` (state 3 rewrites PointLedger emails old→new in a transaction; 5-attempt lock; expiry)
- `hasPendingEmailChange`, `exportAccountsCsv` (BOM UTF-8)
- 28 unit tests (mock-Prisma convention, matching repo style)

### Sub-task 4-6: Admin API
- `GET /api/admin/accounts` (?q, ?sort, ?includeDeleted)
- `PATCH /api/admin/accounts/[id]` (name/phone; `deletedAt: null` = undelete), `DELETE` (soft)
- `POST /api/admin/accounts/[id]/email-change` + `/reverse`
- `POST /api/admin/accounts/[id]/send-reset` (409 while pending — Decision 3)
- `POST /api/admin/accounts/export` (CSV of selected ids)
- `POST /api/auth/forgot-password` now returns 409 while pending (Decision 3)

### Sub-task 7: User-side email-change wall
- `POST /api/auth/email-change/request-otp` (auth'd; 60s cooldown; IP rate limit; sends to NEW email) + tests (5)
- `POST /api/auth/email-change/verify` (state 3; 429 on attempts-exhausted) + tests (6)
- `/verify-email-change` interstitial page (auto-requests OTP on load, OtpInput, resend w/ countdown, sign-out escape, no-pending state)
- OTP email template + `sendOtpEmail` gained `email-change` purpose
- `src/auth.ts`: `authorize` rejects soft-deleted users (Decision 7) and computes `emailChangePending`; jwt override re-checks on `session.update()`
- `src/auth.config.ts`: session callback surfaces flag (edge-safe)
- `src/middleware.ts`: hard wall (Decision 4) — flagged users redirected to `/verify-email-change` on all pages; non-`/api/auth` APIs get 403; matcher extended to all routes (admin guard retained)

### Sub-task 8: Admin UI
- `/admin/accounts` page + `AccountsManager` (table with id/name/email/phone/joinDate, pending + deleted + admin badges, single search box, newest/oldest toggle, 顯示已刪除 filter, checkbox multi-select + CSV button right of search, edit modal: name/phone save, email-change initiate/reverse, send password reset, delete warning + undelete, transactions link)
- Sidebar "帳戶管理" (Users icon)
- `/admin/transactions` reads `?email=` → prefills search (Suspense + useSearchParams)

### Sub-task 9: E2E
- `e2e/accounts.spec.ts` — 7 tests (render + badges, search, includeDeleted reveal + restore, sort + CSV states, initiate → pending badge, reverse affordance, transactions link href)

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest accounts domain (`src/lib/__tests__/accounts.test.ts`) | 28 passed | ✅ |
| Vitest email-change routes | 11 passed | ✅ |
| Vitest full repo | 255 passed | ✅ |
| Playwright accounts.spec.ts | 7 passed | ✅ |
| Playwright full suite | 43 passed | ✅ |
| Type-check (`tsc --noEmit`) | 0 errors | ✅ |
| Lint | 54 problems (36E/18W) — identical to pre-existing baseline | ✅ no new |

---

## Discrepancies from ADR-008 / PLAN-008

| Item | Doc Says | What Happened | Approval |
|------|----------|---------------|----------|
| Undelete endpoint shape | Consequence summary listed `POST .../undelete` | `PATCH [id]` with `{deletedAt: null}` (Decision 7 semantics identical) | Noted here |
| `hasPendingEmailChange` param | Plan: `(email)` | `(userId)` — single lookup, avoids duplicate user query; call sites updated (5-file integration fix) | User pre-approved file-limit flexibility ("fill limit is acceptable") |
| OTP regeneration semantics | Plan: "reuse unexpired OTP" | Regeneration resets attempts — matches existing PasswordReset convention in this repo | Noted here |
| Sub-task 7 file split | 4 files | Split into 7a (template/lib/routes/page, 3 commits) + 7b (auth wall, 1 commit) to stay ≤3 files per commit | Within pre-approved deviation |
| Transactions prefill file | Plan: `src/components/admin/transactions-manager.tsx` | No such file — dashboard is `src/app/admin/(panel)/transactions/page.tsx`; modified directly | Structural reality |
| Coupon E2E quick-fill | Expected "20% off" | Updated to "8折" — spec was stale after commit `c2b811c` changed quick-fills to zh-TW | Pre-existing debt, fixed |

---

## Migration Status

- [x] Local DB migrated — `EmailChangeRequest` + `User.deletedAt` verified
- [ ] **Neon production DB — MANUAL STEP REQUIRED**

### To migrate production:
```bash
# with DATABASE_URL pointing at Neon
npx tsx prisma/run-migration-accounts.ts
```

### Rollback if needed:
```bash
psql "$DATABASE_URL" -f prisma/migrations/rollback/rollback-accounts.sql
```

### Deploy notes
- No new env vars.
- Middleware now runs on all routes (matcher widened for the email-change wall). Admin guard unchanged. Unauthenticated/public requests pass through as before.
- An admin account with its own pending email change is walled out of `/admin` until it verifies or another admin reverses — per Decision 4 "nothing accessible until verified".

---

## Technical Debt

1. **Middleware wall scope is coarse** — all non-`/api/auth` APIs 403 for flagged users, including read-only public-ish endpoints behind auth. Acceptable per Decision 4 (hard wall), revisit if a walled user legitimately needs a specific API during the pending window.
2. **No admin UI for viewing EmailChangeRequest history** (CONFIRMED/REVERSED rows) — audit data exists in DB only. Add a history tab if needed.
3. **OTP wall E2E not covered** — the interstitial page + middleware redirect are verified by manual smoke only (hard to E2E with mocked JWT lacking the flag; a dedicated spec could craft a flagged token via `auth-helpers`).
4. **Password visibility** — permanently unavailable (bcrypt, Decision 1). Lost-email+password users follow the manual recreate-and-transfer-points procedure.
5. **Coupon spec drift** process note — when UI copy changes, grep E2E specs for the old copy in the same commit.

---

## PR Description (draft)

**Title:** feat: admin account management system (ADR-008)

**Body:**

Implements ADR-008: a full admin account dashboard plus the email-change state machine.

- **Accounts dashboard** (`/admin/accounts`): search (id/name/email/phone), newest/oldest sort, deleted filter, CSV export of selected rows, edit modal (name/phone), soft delete with warning + undelete, admin-triggered password reset, link to a user's transactions (prefilled search).
- **Email change (3 states)**: admin initiates → `User.email` flips immediately and old email is stored in `EmailChangeRequest` (PENDING). User must log in with the NEW email; middleware hard-walls every page/API until the 6-digit OTP sent to the new email is verified (`/verify-email-change`). On verify, `PointLedger` rows move old→new email (points transfer, guest balances merge). Admin can reverse while pending (restores old email). Password reset (admin + self-service) is 409-blocked while pending.
- **Soft delete**: `User.deletedAt`; deleted accounts cannot log in, hidden by default, restorable; email stays occupied so points cannot be inherited by re-registration.
- **Schema**: `EmailChangeRequest` table + `User.deletedAt` (rollback SQL included; runner `prisma/run-migration-accounts.ts` — **must be run on Neon before deploy**).
- **Auth**: deleted-user login rejection; `emailChangePending` JWT/session flag; middleware matcher widened to all routes for the wall.

**Tests:** 28 domain + 11 route unit tests; 7 new E2E tests; full suites green (vitest 255, Playwright 43, tsc 0, lint at baseline). Fixed stale coupon E2E quick-fill assertion.

---

## Manual Smoke Test Steps

1. `/admin/accounts` → list renders; search by name/email/phone/id.
2. Sort 最新加入/最早加入 toggles order.
3. Edit modal: change name/phone → 儲存 → row updates.
4. **Email change happy path**: initiate on a test account → login with OLD email fails; login with NEW email + password → lands on `/verify-email-change` (auto-sends OTP to new email) → any other URL redirects back to the wall → enter code → redirected home; admin dashboard shows pending badge gone; points moved (check points dashboard for old vs new email).
5. Reverse: initiate on another account → pending badge → 還原電郵變更 → user logs in with OLD email again.
6. Send password reset: works when no pending; error shown when pending.
7. Delete account (warning) → hidden from list; 顯示已刪除 → row appears with 已刪除 badge → 還原帳戶 → back to normal; deleted user login rejected while deleted.
8. Select 2 rows → 匯出 CSV → file downloads with id,name,email,phone,createdAt (opens correctly in Excel zh-TW).
9. 查看交易紀錄 icon → `/admin/transactions` with search prefilled with that email.
