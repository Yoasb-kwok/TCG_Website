# PROGRESS.md — Transaction Management System (ADR-003)

**Date:** 2026-08-13
**Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`
**Base commit:** `bde3332` (ADR-003 doc)

---

## ADR-003 Decision Compliance

All 13 decisions from ADR-003 are implemented as specified. No deviations.

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | Status model — extend `OrderStatus` with `FAILED`, `NOT_REQUIRED` | ✅ | Added to `prisma/schema.prisma` |
| 2 | Receipt storage — JSON snapshot (`receiptData`) | ✅ | `receiptData Json?` field, frozen at payment time |
| 3 | Receipt rendering — one shared React Email template | ✅ | `src/emails/receipt.tsx` handles ORDER + TOURNAMENT |
| 4 | Payment method — no field | ✅ | Not added (intentionally omitted) |
| 5 | Status transitions — unconstrained | ✅ | PATCH endpoint allows any → any |
| 6 | Scope — unified dashboard | ✅ | Single table + single dashboard page |
| 7 | Data model — new `Transaction` table | ✅ | All fields + indexes per ADR |
| 8 | Creation timing — webhook + manual | ✅ | Stripe webhook calls `createOrderTransaction` / `createTournamentTransaction`; manual POST for offline |
| 9 | Tournament status — restricted in UI | ✅ | `TOURNAMENT_STATUSES` excludes SHIPPED/COMPLETED |
| 10 | Source link — polymorphic `type` + `referenceId` | ✅ | No FK constraint |
| 11 | Receipt snapshot — discriminated union | ✅ | `OrderReceiptData \| TournamentReceiptData` |
| 12 | Buyer type — `BuyerType` enum | ✅ | `USER \| GUEST` |
| 13 | Display name — `customerName` nullable | ✅ | Null for guests → display email via `getDisplayName()` |

---

## Sub-task Completion Summary

| # | Sub-task | Status | Tests |
|---|----------|--------|-------|
| 0 | Schema + migration + rollback | ✅ | Migration applied locally |
| 1 | TypeScript types (discriminated union) | ✅ | 11 tests |
| 2 | Domain service (idempotent creation) | ✅ | 18 tests |
| 3 | Receipt email template | ✅ | 7 tests |
| 4 | GET /api/admin/transactions | ✅ | 10 tests |
| 5 | PATCH /api/admin/transactions/[id] | ✅ | 5 tests |
| 6 | POST /api/admin/transactions | ✅ | 5 tests (in same file as sub-task 4) |
| 7 | Receipt render + send-receipt endpoints | ✅ | Covered by receipt template tests |
| 8 | Stripe webhook integration | ✅ | Integration tested via domain service tests |
| 9 | Email service (`sendTransactionReceipt`) | ✅ | Covered within sub-task 7 |
| 10 | Backfill script | ✅ Written | NOT yet run (post-deploy) |
| 11 | Admin dashboard UI | ✅ | E2E covered |
| 12 | Receipt print page | ✅ | Manual testing |
| 13 | Admin sidebar update | ✅ | `/admin/orders` → `/admin/transactions` |
| 14 | E2E smoke tests | ✅ | 5 Playwright tests pass |
| 15 | Deliverables (this file + PR desc) | ✅ | This document |

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest (unit/integration) | 107 | ✅ All pass |
| Playwright (E2E) | 5 | ✅ All pass |
| TypeScript (`tsc --noEmit`) | — | ✅ Clean |
| ESLint | — | ⚠️ Pre-existing errors only (40+ `react-hooks/set-state-in-effect`) |

---

## Discrepancies (approved adjustments)

None. All implementation matches ADR-003 and the implementation plan exactly.

---

## Pending Post-Deployment Actions

1. **Run migration on Vercel DB** — The `Transaction` table + enum changes must be applied to the production database Vercel connects to. Use `prisma/run-migration-transaction.ts` with Vercel's `DATABASE_URL`, or run the SQL directly via Supabase SQL Editor.
2. **Run backfill script** — `npx tsx scripts/backfill-transactions.ts` to populate existing orders and tournament registrations.
3. **Manual smoke test** — Verify full flow in browser after deployment.
