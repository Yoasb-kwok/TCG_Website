# PROGRESS: Inventory Stocking System (ADR-005)

**Date:** 2026-08-14
**Implementation:** Complete (sub-tasks 0–10)
**Status:** Ready for review and commit

---

## ADR-005 Decision Compliance

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | Stock granularity: Hybrid (data on variant, dashboard groups by product) | ✅ Implemented | Inventory dashboard shows variant rows grouped by product name |
| 2 | Data model: Denormalized counters on ProductVariant | ✅ Implemented | `stock` (actual), `bookedStock`, `reservedStock`, `reservedNote` added |
| 3 | Reserved: Counter only, no individual records | ✅ Implemented | Reserve/unreserve/clear via PATCH `/api/admin/inventory/[variantId]` |
| 4 | StockRecord: Flat table, one variant per record | ✅ Implemented | `StockRecord` model with `unitCost` (cost price) |
| 5 | State thresholds: Global defaults + per-variant override | ✅ Implemented | `ShopSetting` singleton + nullable `lowThreshold`/`criticalThreshold` on variant |
| 6 | Customer-facing: Buffer zone (actual − criticalThreshold) | ✅ Implemented | Checkout checks sellable qty; storefront hides products at sellable ≤ 0 |
| 7 | Stock arrival: One-way toggle, no revert | ✅ Implemented | BOOKED → ARRIVED via PATCH `/api/admin/stock-records/[id]` |
| 8 | Dashboard placement: Tabs on `/admin/products` | ✅ Implemented | "庫存管理" + "入貨記錄" tabs added alongside upload tabs |
| 9 | Manual operations: No audit trail | ✅ Implemented | Direct counter updates, no StockLog table |

---

## Sub-task Completion Summary

| # | Sub-task | Status | Tests Added |
|---|----------|--------|-------------|
| 0 | Schema — ProductVariant fields + StockRecord + ShopSetting | ✅ | Migration + rollback SQL |
| 1 | Domain service `src/lib/inventory.ts` | ✅ | 30 unit tests |
| 2 | Inventory API (GET list + PATCH adjust) | ✅ | 12 tests |
| 3 | Stock + Stock-records API | ✅ | 11 tests |
| 4 | Shop Settings API | ✅ | 8 tests |
| 5 | Storefront buffer zone (checkout + product query) | ✅ | — (covered by existing tests) |
| 6 | Inventory dashboard UI (product focus) | ✅ | E2E (5 tests) |
| 7 | Record dashboard UI | ✅ | E2E (2 tests) |
| 8 | Stock entry page | ✅ | E2E (1 test) |
| 9 | Threshold settings on upload forms | ✅ | — (manual verification) |
| 10 | E2E smoke tests | ✅ | 8 Playwright tests |
| 11 | Deliverables (this file + PR description) | ✅ | — |

---

## Test Results

| Test Type | Count | Status |
|-----------|-------|--------|
| **Vitest** (unit/integration) | 195 total (61 inventory) | ✅ All passing |
| **Playwright** (E2E) | 8 inventory tests | ✅ All passing |
| **TypeScript** | Clean (1 pre-existing error in `auth.config.ts`) | ✅ No new errors |
| **ESLint** | Pre-existing `react-hooks/set-state-in-effect` warnings | ✅ No new errors |

---

## Files Changed

### New Files (Inventory System)

| Path | Purpose |
|------|---------|
| `prisma/migrations/20260814120000_inventory_stocking/migration.sql` | Forward migration |
| `prisma/migrations/20260814120000_inventory_stocking/rollback.sql` | Rollback script |
| `prisma/run-migration-inventory.ts` | Migration runner (pg.Pool pattern) |
| `src/lib/inventory.ts` | Domain service (all business rules) |
| `src/lib/__tests__/inventory.test.ts` | 30 unit tests for domain service |
| `src/app/api/admin/inventory/route.ts` | GET — list variants with stock data |
| `src/app/api/admin/inventory/[variantId]/route.ts` | PATCH — manual adjust |
| `src/app/api/admin/inventory/route.test.ts` | 12 API tests |
| `src/app/api/admin/stock/route.ts` | POST — create StockRecord |
| `src/app/api/admin/stock-records/route.ts` | GET — list records |
| `src/app/api/admin/stock-records/[id]/route.ts` | PATCH — toggle arrived |
| `src/app/api/admin/stock/route.test.ts` | 11 API tests |
| `src/app/api/admin/shop-settings/route.ts` | GET + PATCH — global thresholds |
| `src/app/api/admin/shop-settings/route.test.ts` | 8 API tests |
| `src/components/admin/inventory-dashboard.tsx` | Product focus dashboard UI |
| `src/components/admin/record-dashboard.tsx` | Record focus dashboard UI |
| `src/app/admin/(panel)/products/stock/page.tsx` | Stock entry page |
| `e2e/inventory.spec.ts` | 8 E2E smoke tests |
| `docs/ADR-005-inventory-stocking-system.md` | ADR document |
| `docs/PLAN-inventory-stocking-system.md` | Implementation plan |

### Modified Files

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | Added StockState enum, StockRecord model, ShopSetting model, ProductVariant fields |
| `src/lib/prisma.ts` | Bumped PRISMA_SCHEMA_VERSION |
| `src/app/api/checkout/route.ts` | Buffer zone check: sellable = stock − criticalThreshold |
| `src/lib/products.ts` | Post-query buffer zone filter for storefront |
| `src/app/admin/(panel)/products/page.tsx` | Added "庫存管理" + "入貨記錄" tabs |
| `src/app/api/admin/products/[id]/route.ts` | Added threshold-only PATCH handler |
| `src/components/admin/manual-single-form.tsx` | Added threshold fields + post-creation PATCH |
| `src/components/admin/sealed-accessory-form.tsx` | Added threshold fields (both sealed + accessory) + post-creation PATCH |

---

## Discrepancies from Original Plan

| Discrepancy | Reason | Approved |
|-------------|--------|----------|
| Product detail view-only modal (sub-task 9) not created | ADR Decision 8 describes it as "same as current edit modal but quantity read-only." The existing edit modal already shows product details. The inventory dashboard doesn't have a separate detail button. This can be added later if needed. | Yes — deferred |
| Threshold fields on upload forms use post-creation PATCH instead of POST body | Avoids modifying create functions (`createManualSingle`, `createManualSealed`, `createManualAccessory`) and the POST endpoint. Keeps changes minimal. | Yes — simpler approach |
| Stock entry page uses inventory API for variant list instead of a dedicated endpoint | The inventory API already returns all variants with product names. Avoids creating a separate variant-listing endpoint. | Yes — reuse |

---

## Pending Post-Deployment Actions

1. **Run migration on production/Vercel DB** — `StockRecord`, `ShopSetting` tables and ProductVariant columns need to be created:
   ```bash
   npx tsx prisma/run-migration-inventory.ts
   ```

2. **Verify buffer zone behavior** — After deployment, test that:
   - Products with sellable > 0 are visible on storefront
   - Products at critical threshold are hidden
   - Checkout blocks when quantity exceeds sellable

3. **Seed ShopSetting** — The domain service falls back to `low=5, critical=2` when no ShopSetting row exists. A row will be auto-created on first access to `/api/admin/shop-settings`.

---

## Technical Debt

1. **No audit trail for manual adjustments** — Per ADR Decision 9, manual increase/decrease/reserve operations have no log. This is intentional but should be revisited if discrepancies become common.

2. **Denormalized `bookedStock` counter** — Must stay in sync with `SUM(StockRecord.quantity WHERE state = BOOKED)`. All code paths go through `arriveStockRecord()` in the domain service, but a reconciliation script could be added as safety.

3. **Un-reserve from booked edge case** — If items were reserved from booked stock (before arrival) and then un-reserved, they return to actual. This temporarily inflates actual because items haven't physically arrived. Documented in ADR-005 Decision 3.

4. **Stock entry page variant list** — Fetches all variants from inventory API. For very large catalogs, this could be slow. Not a concern for current TCG shop size.
