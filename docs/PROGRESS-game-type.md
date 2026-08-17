# PROGRESS: Game Type System (PLAN-006)

**Date:** 2026-08-14
**ADR:** [ADR-006: Game Type System](./ADR-006-game-type-system.md)
**Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`

---

## Summary

Implemented multi-TCG support via the GameType system per ADR-006. The shop can now sell Pokémon, One Piece, and Disney Lorcana products with game-scoped taxonomy, storefront routing, and admin management.

---

## What Was Built

- [x] **GameType table** — New Prisma model with `id`, `name`, `slug`, `sortOrder`, `isActive`, timestamps
- [x] **Foreign keys** — `Product.gameTypeId` (required, backfilled to Pokémon), `TaxonomyOption.gameTypeId` (nullable, null = shared)
- [x] **Migration + rollback** — `prisma/migrations/20260815000000_game_type/migration.sql` + `rollback-gametype.sql`
- [x] **Migration runner** — `prisma/run-migration-gametype.ts` (manual SQL via `pg.Pool`, avoids Prisma P3005)
- [x] **Domain layer** — `src/lib/game-types.ts` with CRUD operations + 14 unit tests
- [x] **Public API** — `GET /api/games` (list active game types for storefront tabs)
- [x] **Admin API** — `GET/POST/PATCH/DELETE /api/admin/games` + `/api/admin/games/[id]`
- [x] **Dynamic route** — `/products/[gameType]/page.tsx` (server component, validates slug)
- [x] **Redirect** — `/products/page.tsx` redirects (302) to `/products/pokemon`
- [x] **Game tabs** — `src/components/marketplace/game-tabs.tsx` (client component, auto-fetches game types)
- [x] **Marketplace shell** — Accepts `gameTypeSlug` prop, renders `GameTabs`, passes game type to product/taxonomy API
- [x] **Game-scoped product query** — `getProducts()` accepts `gameType` filter
- [x] **Game-scoped taxonomy** — `listTaxonomyOptions()` and `listTaxonomyGrouped()` accept `gameTypeId` filter
- [x] **Admin games page** — `/admin/games` with full CRUD UI (`GamesManager` component)
- [x] **Admin sidebar** — Added "遊戲管理" nav item with `Gamepad2` icon
- [x] **Product upload form** — `manual-single-form.tsx` has game type dropdown
- [x] **E2E smoke test** — 4 tests: storefront redirect, game tabs visibility, admin list, admin create button

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest (unit/integration) | 211 passed (20 test files) | ✅ |
| Playwright (game-type.spec.ts) | 4 passed | ✅ |

---

## Discrepancies from ADR-006

| Item | ADR Says | What Happened | Justification |
|------|----------|---------------|---------------|
| Sealed/accessory upload form game type dropdown | Decision 7: "each existing product upload form" gets a game type dropdown | Only `manual-single-form.tsx` was updated; `sealed-accessory-form.tsx` was not | Deferred due to 3-file atomic commit limit. The admin product route has `DEFAULT_GAME_TYPE_ID` fallback so sealed/accessory products still work (assigned to Pokémon by default). Follow-up task. |
| Taxonomy admin page game type filter | Decision 11: taxonomy admin page gets a game type filter dropdown | Taxonomy DB layer and API support the filter, but the admin taxonomy UI filter dropdown was not added | The taxonomy API (`/api/taxonomy?gameType=pokemon`) and DB layer (`listTaxonomyOptions`, `listTaxonomyGrouped`) support filtering. The admin UI dropdown is deferred. |
| E2E test taxonomy mock | (not in ADR) | Mock returned `{ grouped: {} }` which caused `FilterPanel` to crash | Fixed: mock now returns `{ grouped: { PRODUCT_TYPE: [], SET_CODE: [], RARITY: [] } }` |

---

## Migration Status

- [x] Local DB migrated — GameType table created, Pokémon seeded, existing products/taxonomy backfilled
- [ ] **Vercel/production DB migrated** — MANUAL STEP REQUIRED

### To migrate production:
```bash
npx tsx prisma/run-migration-gametype.ts
```

This must be run with the production `DATABASE_URL` environment variable set.

---

## Technical Debt

1. **Sealed/accessory form missing game type dropdown** — `sealed-accessory-form.tsx` doesn't have the game type selector. Products created via this form default to Pokémon (`DEFAULT_GAME_TYPE_ID`). Low risk for now since all current products are Pokémon.

2. **Taxonomy admin UI filter not added** — The backend supports `gameTypeId` filtering, but the admin taxonomy page doesn't have the dropdown UI yet. Taxonomy options can still be filtered via API.

3. **Pre-existing TypeScript error** — `src/auth.config.ts:14` — `user.id` is `string | undefined`. NOT from this feature.

4. **Pre-existing lint errors** — 34+ `react-hooks/set-state-in-effect` warnings throughout the codebase. NOT from this feature.

5. **FilterPanel not defensive against missing taxonomy keys** — `grouped.PRODUCT_TYPE.length`, `grouped.SET_CODE`, `grouped.RARITY` are accessed without null checks. Works in production (API always returns these keys) but fragile for testing.

---

## Manual Smoke Test Steps

### Storefront
1. Go to `/products` → should redirect to `/products/pokemon`.
2. Game type tabs visible at top: **Pokémon** (active), **One Piece** / **Lorcana** (if created via admin).
3. Click a non-Pokémon tab → URL changes to `/products/[slug]`, filter panel updates.
4. Search "test" on a game page → only that game's products appear.
5. Filter panel only shows that game's taxonomy (no cross-game rarities/sets).

### Admin
6. Go to `/admin/games` → see list of game types (at least Pokémon).
7. Click "新增" → enter "One Piece", slug auto-fills → save.
8. Go to product upload form → select "One Piece" in game dropdown → taxonomy dropdowns update.
9. Upload an One Piece product → verify it appears on `/products/one-piece`.
10. Go to `/admin/games` → try to delete "Pokémon" → should show warning (products linked).

### Edge Cases
11. `/products/invalid-game` → should show 404.
12. Existing Pokémon products still appear correctly on `/products/pokemon`.
13. Home page "熱門商品" still shows featured products (unified, any game).
