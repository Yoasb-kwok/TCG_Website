# PROGRESS: Coupon Management System (PLAN-007)

**Date:** 2026-08-14
**ADR:** [ADR-007: Coupon Management System](./ADR-007-coupon-management-system.md)
**Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`

---

## Summary

Implemented standalone coupon record system per ADR-007. Admin can create, view, edit, toggle active/inactive, and delete coupons through a dedicated admin dashboard.

---

## What Was Built

- [x] **Coupon table** — Prisma model (`Coupon`): id, name, code (unique), description, quantity, isActive
- [x] **Migration + rollback** — `prisma/migrations/20260816000000_coupon/migration.sql` + `rollback-coupon.sql`
- [x] **Migration runner** — `prisma/run-migration-coupon.ts` (manual SQL via `pg.Pool`)
- [x] **Domain layer** — `src/lib/coupons.ts` with `generateCouponCode`, `listCoupons`, `createCoupon`, `updateCoupon`, `deleteCoupon`
- [x] **Unit tests** — 5 tests for `generateCouponCode` (slugify logic)
- [x] **Admin API** — `GET/POST /api/admin/coupons` + `PATCH/DELETE /api/admin/coupons/[id]`, all with `requireAdmin()`
- [x] **Admin page** — `/admin/coupons` with `CouponsManager` component
- [x] **Sidebar item** — "優惠券" with `Ticket` icon
- [x] **Coupons manager UI** — Table (name, description, quantity, status, actions), create/edit form with quick-fill buttons (20% off, HK$50 off, Buy 1 Get 1 Free, Free Shipping), active toggle, delete with confirmation
- [x] **E2E smoke test** — 3 tests: coupon list renders, create button + empty state, quick-fill populates description

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest (coupons) | 5 passed | ✅ |
| Playwright (coupon.spec.ts) | 3 passed | ✅ |
| Type-check | Pre-existing auth.config.ts error only | ✅ |

---

## Discrepancies from ADR-007

| Item | ADR Says | What Happened | Justification |
|------|----------|---------------|---------------|
| — | — | No deviations | All decisions implemented as specified |

---

## Migration Status

- [x] Local DB migrated — `Coupon` table created and verified
- [ ] **Vercel/production DB migrated** — MANUAL STEP REQUIRED

### To migrate production:
```bash
npx tsx prisma/run-migration-coupon.ts
```

---

## Technical Debt

1. **No checkout integration** — Coupons are standalone records. Per ADR-007, checkout integration is a future iteration that will add `discountType` + `discountValue` fields and auto-decrement on redemption.
2. **Code field not shown in UI** — The `code` field is auto-generated and stored but not displayed in the admin table. It's used for uniqueness and future external reference. Can be shown if needed.
3. **No quantity auto-decrement** — Admin manually changes quantity. Will be automated when checkout integration is added.

---

## Manual Smoke Test Steps

### Admin
1. Go to `/admin/coupons` → see empty state "暫無優惠券".
2. Click "新增" → form appears.
3. Fill in name "Summer Sale", quantity 50 → code auto-fills as "summer-sale".
4. Click "20% off" quick-fill → description populates with "20% off".
5. Click "建立" → coupon appears in table.
6. Click edit (pencil) → form pre-fills → change quantity to 30 → "更新" → verify updated.
7. Click status badge ("有效") → toggles to "停用".
8. Click delete → confirmation dialog → confirm → coupon removed.

### Edge Cases
9. Try to create with empty name → error "請填寫優惠券名稱".
10. Try to create with negative quantity → error "數量必須為 0 或正整數".
