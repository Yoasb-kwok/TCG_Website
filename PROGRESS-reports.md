# PROGRESS-reports.md — Monthly Revenue Report (ADR-009)

## Status: Complete

All validations at completion: **vitest 303/303** (47 new), **Playwright 48/48** (5 new),
`tsc --noEmit` 0 errors, lint 54 problems (36E/18W) — identical to pre-work baseline.

## ADR-009 Decision Compliance

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | Earned = PAID + SHIPPED + COMPLETED + NOT_REQUIRED | ✅ | `EARNED_STATUSES` in `src/lib/reports.ts`, enforced in SQL + pure filter |
| 2 | Spent = ARRIVED stock only, by `arrivedAt` | ✅ | `fetchMonthlyReport` stock query |
| 3 | `paidAt` field, set on entry into money status, backfill = createdAt, HK months | ✅ | Migration `20260817120000_paidat` + all 4 write paths maintained |
| 4 | Live recompute, no snapshots | ✅ | Pure read-side queries |
| 5 | `/admin/reports` sidebar page ("收益報告") | ✅ | Month picker defaults to current HK month |
| 6 | 3 cards + revenue split + expense table | ✅ | `reports-manager.tsx` |
| 7 | CSV export (server blob, BOM) | ✅ | `/api/admin/reports/export` |

## Sub-task Completion Summary

| # | Sub-task | Status | Tests |
|---|----------|--------|-------|
| 1 | Schema — `Transaction.paidAt` + index + rollback + runner | ✅ | Migration applied locally (backfill verified) |
| 2 | Domain lib `src/lib/reports.ts` | ✅ | 23 unit tests |
| 3 | paidAt in transaction creators | ✅ | 4 new tests (22 total in file) |
| 4a | paidAt on manual POST /api/admin/transactions | ✅ | 2 new tests (17 total) |
| 4b | paidAt on PATCH /api/admin/transactions/[id] | ✅ | 5 new tests + 3 mocks updated (10 total) |
| 4c | Ledger creation on manual order PAID | ✅ | 4 tests (new file) |
| 5 | API routes (report JSON + CSV export) | ✅ | 9 tests |
| 6 | UI — page, manager, sidebar | ✅ | E2E covered |
| 7 | E2E smoke tests | ✅ | 5 Playwright tests |

## Discrepancies vs ADR Letter (flagged for approval)

1. **`PATCH /api/admin/orders/[id]` mechanism.** ADR-009 lists this file as
   "Set paidAt on manual PAID transition" — but the route never wrote to the
   `Transaction` ledger at all (pre-existing gap from ADR-003: manual-PAID
   orders had no ledger row, so they were invisible in the transaction
   dashboard *and* would be missing from revenue). Implemented as:
   on any money-received status (PAID/SHIPPED/COMPLETED), call
   `createOrderTransaction(order.id)` (idempotent), which creates the ledger
   row with `paidAt`. Net effect: manual orders now appear in both the
   transaction dashboard and the revenue report.
1b. **Tournament self-heal route** (`src/app/api/tournaments/register/session/route.ts`):
   pre-existing ADR-003 gap found during code review — payment self-heal never
   created a Transaction row and the webhook guard would skip it permanently.
   Fixed with an idempotent `createTournamentTransaction` call (see review
   section). Flagged for approval alongside item 1.
2. **PATCH read-before-write.** `PATCH /api/admin/transactions/[id]` now fetches
   the old status before updating (needed to apply the transition rule
   "set paidAt only when entering money status from non-money"). Three
   existing route tests had their prisma mocks extended with `findUnique`.
3. **Backfill script note.** Re-running `scripts/backfill-transactions.ts`
   after this change would stamp `paidAt = now` for any missing historical
   transactions (they'd land in the current month). The script is one-time
   and already ran; do not re-run it. The SQL migration's backfill
   (`paidAt = createdAt`) is the sanctioned approximation.

## Code Review Outcome

Reviewed (full working-tree diff vs ADR-009). **No blockers.** Verdict: faithful
implementation of all 7 decisions.

**Fixed from review findings:**

- Tournament self-heal ledger leak (pre-existing ADR-003 gap): tournament
  self-checkout verification flipped `paymentStatus` to PAID without creating
  a Transaction row; the webhook's PENDING guard then skipped it forever —
  that revenue was invisible to the report. Now calls
  `createTournamentTransaction` (idempotent) in
  `src/app/api/tournaments/register/session/route.ts`.
- Direct PENDING→SHIPPED/COMPLETED manual order transitions now also create
  the ledger row (`isEarnedStatus(status)` instead of `=== "PAID"`) — walk-in
  sales that skip PAID no longer leak from revenue.
- Reports UI: error state no longer shows an eternal spinner; stale error
  banner clears on successful month switch; unreachable empty branch removed.
- E2E month-navigation test no longer coupled to the real clock (mock echoes
  requested month).
- `isValidMonth` rejects years < 1000 (`0099-08` would be remapped to 1999
  by `Date.UTC`).
- Migration runner wraps SQL in BEGIN/COMMIT with ROLLBACK on failure.

**Accepted/deferred (low risk, single-admin shop):**

- Read-then-write race in PATCH paidAt rule (no transaction/lock). Practical
  risk ≈ 0 with one admin; revisit if concurrent admins become real.
- CSV sections separated by a blank line (intentional, readable in Excel).
- `net`/splits rounded independently of `earned`/`spent` — cent-level float
  disagreement theoretically possible with >2-decimal amounts.
- Future months reachable by typing in the picker (shows zeros) while the
  "next" chevron is disabled — harmless inconsistency.

## Technical Debt

- `formatPrice` (`src/lib/format.ts`) rounds to 0 decimals; the report uses a
  local 2-decimal formatter. If receipts/reports need consistent cents, unify.
- Month picker blocks "next" beyond the current HK month (future = empty).
- No cross-month chart (ADR-009 Decision 6 rejected for now; review trigger:
  enough months of data).

## Manual Smoke Test Steps (browser)

1. `npm run dev`, log in as admin (`admin@trtcg.hk` / `123456`)
2. Sidebar shows **收益報告** (after 交易管理) → click
3. Current month loads: 收入 / 支出 / 淨利 cards, 收入來源 split, 到貨支出 table
4. Click ◀ (上一個月) — numbers reload for previous month; ▶ disabled at current month
5. Type a month into the picker (e.g. `2026-01`) — report reloads
6. Click 匯出 CSV — downloads `revenue-report-<month>.csv`; opens in Excel with Chinese intact (BOM)
7. Create a manual transaction (交易管理 → 新增) with default status → re-open 收益報告 → 收入 includes it
8. Toggle a transaction PAID → CANCELLED → 收入 drops (refund deducted live)

## Deploy Notes

- Run `npx tsx prisma/run-migration-paidat.ts` against the Neon production DB
  **before** the next Vercel deploy (same procedure as the accounts migration).
- No new env vars. No Vercel config changes.
