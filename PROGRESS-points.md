# PROGRESS-points.md — Points / Loyalty System (ADR-004)

**Date:** 2026-08-13
**Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`
**Base commit:** `bde3332` (docs: ADR-003)

---

## ADR-004 Decision Compliance

All 11 decisions from ADR-004 are implemented as specified. No deviations.

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | Data model — ledger-only, email-keyed | ✅ | `PointLedger` table with `email`, `delta`, `reason`, `referenceId`, `note`. Balance = `SUM(delta) WHERE email = ?` |
| 2 | Earning calculation — integer, `Math.floor` | ✅ | 1 point per HKD 1, floored |
| 3 | Earning amount — subtotal only (no shipping) | ✅ | Free tournaments = 0 points, no ledger entry |
| 4 | Trigger — service module inside transaction flow | ✅ | `src/lib/points.ts` called from webhook + admin |
| 5 | Manual PAID also awards points (idempotency guard) | ✅ | `awardOrderPoints` called on admin PATCH to PAID, dedup by `referenceId + reason` |
| 6 | Header display — client-side fetch with loading | ✅ | `GET /api/user/points`, skeleton animation while loading |
| 7 | Admin adjustment — absolute set with required reason | ✅ | `PATCH /api/admin/points` with `note` field required, clamped to `≥ 0` |
| 8 | Page indicators — context-aware for guests | ✅ | Products, tournaments, checkout show "賺 N 分"; guests see hint to register |
| 9 | Admin search — name OR email, case-insensitive | ✅ | `WHERE email ILIKE OR name ILIKE` |
| 10 | Balance floor at 0 | ✅ | `Math.max(0, SUM(delta))` in `getPointsBalance` |
| 11 | Admin dashboard — rank by points (descending) | ✅ | Aggregated query ordered by `balance DESC` |

---

## Sub-task Completion Summary

| # | Sub-task | Status | Tests |
|---|----------|--------|-------|
| 0 | Schema — `PointLedger` model + `PointReason` enum + rollback | ✅ | Migration applied locally |
| 1 | Domain service `src/lib/points.ts` | ✅ | 15 unit tests |
| 2 | `GET /api/user/points` | ✅ | 4 tests |
| 3 | `GET + PATCH /api/admin/points` | ✅ | 8 tests |
| 4 | Webhook + admin orders integration | ✅ | Covered by domain service tests |
| 5 | Header points badge (loading animation) | ✅ | E2E covered |
| 6 | Admin sidebar — "積分管理" nav item | ✅ | E2E covered |
| 7 | Admin points dashboard (search, filter, sort, edit) | ✅ | 4 E2E tests |
| 8 | Page indicators (product, tournament, checkout) | ✅ | Manual testing |
| 9 | About page description | ✅ | Manual testing |
| 10 | E2E smoke tests | ✅ | 4 Playwright tests pass |
| 11 | Deliverables (this file + PR description) | ✅ | This document |

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest (unit/integration) | 134 | ✅ All pass (includes 27 new points tests) |
| Playwright (E2E) | 21 | ✅ All pass (4 points + 5 transactions + 12 auth) |
| TypeScript (`tsc --noEmit`) | — | ✅ Clean (1 pre-existing error in `auth.config.ts:14`, unrelated) |
| ESLint | — | ⚠️ Pre-existing errors only (40+ `react-hooks/set-state-in-effect`) |

---

## Discrepancies (approved adjustments)

1. **`role="dialog"` added to edit modal** — The admin points edit modal originally used a plain `<div>` without ARIA attributes. Added `role="dialog"`, `aria-modal="true"`, and `aria-label` to the modal container. This is an accessibility improvement and was needed for the E2E test selector to work correctly.

2. **`POINTS_RATE` extracted to `points-constants.ts`** — Originally `POINTS_RATE` lived in `src/lib/points.ts`. However, importing it from client components (`product-card.tsx`, `cart-sheet.tsx`, `register/page.tsx`) pulled in `getPrisma` → `pg` (Node.js-only) → Turbopack build failure ("Can't resolve 'dns'/'fs'/'net'"). Fixed by extracting the constant to `src/lib/points-constants.ts` which has no Prisma imports. All client components import from there. This does not change any behavior.

---

## Pending Post-Deployment Actions

1. **Run migration on Vercel DB** — The `PointLedger` table + `PointReason` enum must be applied to the production database. Use `prisma/run-migration-points.ts` with Vercel's `DATABASE_URL`, or run the SQL directly via Supabase SQL Editor.

2. **Manual smoke test** — Verify full flow in browser after deployment:
   - Header points badge appears for logged-in users
   - Product cards show "賺 N 分"
   - Checkout shows "將獲得積分"
   - Tournament registration shows "賺 N 積分"
   - Admin points dashboard at `/admin/points` shows accounts with rank
   - Admin edit dialog works (adjust points with required reason)
   - Purchase with Stripe webhook awards points
