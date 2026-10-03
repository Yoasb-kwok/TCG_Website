# PLAN-006: Game Type System Implementation Plan

**ADR:** [ADR-006: Game Type System](./ADR-006-game-type-system.md)
**Branch:** `feature/game-type-system` (create from current branch)
**Created:** 2026-08-14

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
- `npm run lint`, `npm run type-check`, and `npm run test` must pass after every file save.
- Print terminal output as proof. Do not assume they pass.

---

## HARD RULES FOR THE IMPLEMENTING AGENT

1. **SPEC LOCK**: You cannot change this plan or the ADR-006 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: You are restricted to editing a maximum of **3 files per sub sub-task**. Break larger tasks down.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after EVERY file save. You must print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-task #4, #7, #10, and #13, re-read ADR-006 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize writing 1 end-to-end (E2E) smoke test (Playwright) for the main user flow. If the E2E passes, the core logic is solid.

---

## Sub-Task Overview

| # | Sub-Task | Files | Dependency |
|---|----------|-------|------------|
| 1 | Prisma schema: GameType model + FKs | `schema.prisma`, rollback SQL | — |
| 2 | Migration runner + apply to DB | `prisma/run-migration-gametype.ts` | #1 |
| 3 | Domain layer: game type CRUD | `src/lib/game-types.ts` + test | #2 |
| 4 | API: `/api/games` (public) + `/api/admin/games` (CRUD) | 2 route files + test | #3 |
| 5 | Storefront: dynamic route `/products/[gameType]` | route page + redirect | #4 |
| 6 | Storefront: game type tabs component | `game-tabs.tsx` + marketplace shell | #5 |
| 7 | Storefront: filter panel + product query scoped by game | `products.ts` + `filter-panel.tsx` | #6 |
| 8 | Admin: `/admin/games` page (CRUD UI) | admin page + nav | #4 |
| 9 | Admin: taxonomy page game type filter | taxonomy page + provider | #4 |
| 10 | Admin: product upload forms game type dropdown | upload forms | #7, #9 |
| 11 | E2E smoke test (Playwright) | test file | #5–#10 |
| 12 | Deliverables: PROGRESS.md + PR description | docs | #11 |

---

## Sub-Task 1: Prisma Schema — GameType Model + Foreign Keys

**Goal:** Add the `GameType` model and `gameTypeId` columns to `Product` and `TaxonomyOption`.

**Files (max 3):**
1. `prisma/schema.prisma` — Add `GameType` model; add `gameTypeId` to `Product` (required) and `TaxonomyOption` (nullable); add relations.
2. `prisma/migrations/rollback/rollback-gametype.sql` — Down migration script.
3. `prisma/migrations/20260815000000_game_type/migration.sql` — Up migration SQL.

### Schema Changes

```prisma
model GameType {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  products        Product[]
  taxonomyOptions TaxonomyOption[]
}

// Product: add
gameTypeId String
gameType   GameType @relation(fields: [gameTypeId], references: [id])

// TaxonomyOption: add
gameTypeId String?
gameType   GameType? @relation(fields: [gameTypeId], references: [id])
```

### Migration SQL (up)

```sql
CREATE TABLE "GameType" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Seed default game type
INSERT INTO "GameType" ("id", "name", "slug", "sortOrder")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Pokémon',
  'pokemon',
  0
);

-- Add gameTypeId to Product (required, backfill to Pokémon)
ALTER TABLE "Product" ADD COLUMN "gameTypeId" TEXT;

UPDATE "Product" SET "gameTypeId" = '00000000-0000-0000-0000-000000000001';

ALTER TABLE "Product" ALTER COLUMN "gameTypeId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_gameTypeId_fkey"
  FOREIGN KEY ("gameTypeId") REFERENCES "GameType"("id") ON DELETE RESTRICT;
CREATE INDEX "Product_gameTypeId_idx" ON "Product"("gameTypeId");

-- Add gameTypeId to TaxonomyOption (nullable)
ALTER TABLE "TaxonomyOption" ADD COLUMN "gameTypeId" TEXT;

-- Backfill: PRODUCT_TYPE stays null (shared), all others → Pokémon
UPDATE "TaxonomyOption"
SET "gameTypeId" = '00000000-0000-0000-0000-000000000001'
WHERE "kind" != 'PRODUCT_TYPE';

ALTER TABLE "TaxonomyOption" ADD CONSTRAINT "TaxonomyOption_gameTypeId_fkey"
  FOREIGN KEY ("gameTypeId") REFERENCES "GameType"("id") ON DELETE SET NULL;
CREATE INDEX "TaxonomyOption_gameTypeId_idx" ON "TaxonomyOption"("gameTypeId");
```

### Rollback SQL (down)

```sql
ALTER TABLE "TaxonomyOption" DROP CONSTRAINT IF EXISTS "TaxonomyOption_gameTypeId_fkey";
ALTER TABLE "TaxonomyOption" DROP COLUMN IF EXISTS "gameTypeId";

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_gameTypeId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "gameTypeId";

DROP TABLE IF EXISTS "GameType";
```

### Steps
1. Write the schema changes in `schema.prisma`.
2. Write the rollback SQL in `prisma/migrations/rollback/rollback-gametype.sql`.
3. Write the up migration SQL in `prisma/migrations/20260815000000_game_type/migration.sql`.
4. Run `npx prisma generate` to regenerate the Prisma client.
5. Run `npm run type-check` to verify types compile.

### Verification
- `npx prisma generate` succeeds.
- `npm run type-check` passes.
- `npm run lint` passes.

---

## Sub-Task 2: Migration Runner — Apply to Database

**Goal:** Create a script to run the migration via `pg.Pool` (same pattern as existing `prisma/run-migration-*.ts` files).

**Files (max 2):**
1. `prisma/run-migration-gametype.ts` — Runner script.
2. `src/lib/prisma.ts` — Update `PRISMA_SCHEMA_VERSION` constant.

### Steps
1. Read existing `prisma/run-migration-stockrecord.ts` to follow the same pattern.
2. Create `run-migration-gametype.ts` that reads and executes the up migration SQL via `pg.Pool`.
3. Update `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts` to `"20260815000000_game_type"`.
4. Run the migration script locally.
5. Verify with a quick Prisma query that `GameType` table exists and has the Pokémon row.

### Verification
- Migration script runs without error.
- `SELECT * FROM "GameType"` returns the Pokémon row.
- `npm run type-check` passes.

---

## Sub-Task 3: Domain Layer — Game Type CRUD + Tests

**Goal:** Create the domain service for game type operations. Write tests first (TDD).

**Files (max 3):**
1. `src/lib/__tests__/game-types.test.ts` — Unit tests (write first, must fail).
2. `src/lib/game-types.ts` — Domain service functions.
3. *(If test file hits 3-file limit, defer lint/type-check config to next step.)*

### Functions to Implement

```typescript
// src/lib/game-types.ts

export async function listActiveGameTypes(): Promise<GameType[]>
// Returns all game types where isActive = true, ordered by sortOrder

export async function getGameTypeBySlug(slug: string): Promise<GameType | null>
// Returns game type by slug, or null if not found/inactive

export async function getGameTypeById(id: string): Promise<GameType | null>

export async function createGameType(input: {
  name: string
  slug: string
  sortOrder?: number
}): Promise<GameType>
// Validates slug uniqueness. Auto-generates slug from name if not provided.

export async function updateGameType(id: string, input: {
  name?: string
  slug?: string
  sortOrder?: number
  isActive?: boolean
}): Promise<GameType>

export async function deleteGameType(id: string): Promise<void>
// Prevents deletion if products or taxonomy options are linked.
// Throws error with message: "無法刪除：仍有 N 個商品和 M 個標籤關聯到此遊戲"
```

### Test Cases (must fail first)

```
listActiveGameTypes
  ✓ returns game types ordered by sortOrder
  ✓ excludes inactive game types

getGameTypeBySlug
  ✓ returns game type by slug
  ✓ returns null for non-existent slug
  ✓ returns null for inactive game type

createGameType
  ✓ creates a game type with name and slug
  ✓ auto-generates slug from name if not provided
  ✓ rejects duplicate slug
  ✓ rejects empty name

deleteGameType
  ✓ deletes game type with no linked products or taxonomy
  ✓ throws if products are linked
  ✓ throws if taxonomy options are linked

updateGameType
  ✓ updates name
  ✓ updates sortOrder
  ✓ updates isActive
  ✓ rejects duplicate slug on update
```

### Steps
1. Write `src/lib/__tests__/game-types.test.ts` with all test cases above.
2. Run tests — they must fail (no implementation yet).
3. Write `src/lib/game-types.ts` with the domain functions.
4. Run tests — they should pass.
5. Run `npm run lint` and `npm run type-check`.

### Verification
- All test cases pass.
- `npm run lint` passes.
- `npm run type-check` passes.

---

## Sub-Task 4: API Routes — Public List + Admin CRUD

> **⚠️ CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-006 and this plan. Summarize your progress.

**Goal:** Create API endpoints for game types.

**Files (max 3):**
1. `src/app/api/games/route.ts` — `GET` public (list active game types).
2. `src/app/api/admin/games/route.ts` — `GET` (list all), `POST` (create).
3. `src/app/api/admin/games/[id]/route.ts` — `PATCH` (update), `DELETE` (delete).

### API Spec

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/games` | GET | Public | List active game types (for storefront tabs) |
| `/api/admin/games` | GET | Admin | List all game types (including inactive) |
| `/api/admin/games` | POST | Admin | Create game type |
| `/api/admin/games/[id]` | PATCH | Admin | Update game type |
| `/api/admin/games/[id]` | DELETE | Admin | Delete game type (blocks if linked) |

### Steps
1. Write `src/app/api/games/route.ts` — public GET handler.
2. Write `src/app/api/admin/games/route.ts` — admin GET + POST.
3. Write `src/app/api/admin/games/[id]/route.ts` — admin PATCH + DELETE.
4. Write tests for each endpoint (auth check, happy path, error cases).
5. Run `npm run lint`, `npm run type-check`, `npm run test`.

### Verification
- `GET /api/games` returns active game types without auth.
- `POST /api/admin/games` returns 401 without admin session.
- `POST /api/admin/games` creates game type with admin session.
- `DELETE /api/admin/games/[id]` returns 400 if products are linked.

---

## Sub-Task 5: Storefront — Dynamic Route `/products/[gameType]`

**Goal:** Move the products page to a dynamic route scoped by game type.

**Files (max 3):**
1. `src/app/products/[gameType]/page.tsx` — New dynamic route page.
2. `src/app/products/page.tsx` — Change to redirect to `/products/pokemon`.
3. *(If needed: `src/app/products/[gameType]/layout.tsx` for metadata.)*

### Steps
1. Create `src/app/products/[gameType]/page.tsx`:
   - Server component that validates the `gameType` slug exists.
   - If invalid, call `notFound()`.
   - Pass `gameTypeSlug` to `MarketplaceShell` via a prop or context.
2. Modify `src/app/products/page.tsx`:
   - Replace the existing page with `redirect('/products/pokemon')`.
3. Update `MarketplaceShell` to accept a `gameTypeSlug` prop and pass it to the API fetch.
4. Run `npm run lint`, `npm run type-check`.

### Verification
- `/products/pokemon` renders the marketplace.
- `/products/invalid-slug` returns 404.
- `/products` redirects to `/products/pokemon`.

---

## Sub-Task 6: Storefront — Game Type Tabs Component

**Goal:** Add game-type tab navigation at the top of the products page.

**Files (max 3):**
1. `src/components/marketplace/game-tabs.tsx` — Tabs component.
2. `src/components/marketplace/marketplace-shell.tsx` — Add tabs above the product grid.
3. *(Styling if needed.)*

### Steps
1. Create `src/components/marketplace/game-tabs.tsx`:
   - Server component or client component that fetches active game types from `/api/games`.
   - Renders horizontal tabs: each tab links to `/products/[slug]`.
   - Active tab highlighted based on current `gameType` prop.
2. Modify `src/components/marketplace/marketplace-shell.tsx`:
   - Accept `gameTypeSlug` prop.
   - Render `<GameTabs active={gameTypeSlug} />` at the top.
   - Pass `gameType` to the `/api/products` fetch as a query param.
3. Run `npm run lint`, `npm run type-check`.

### Verification
- Tabs render with all active game types.
- Clicking a tab navigates to that game's route.
- Active tab is visually highlighted.
- `npm run type-check` passes.

---

## Sub-Task 7: Storefront — Product Query + Filter Panel Scoped by Game

> **⚠️ CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-006 and this plan. Summarize your progress.

**Goal:** Filter products and taxonomy by game type on the storefront.

**Files (max 3):**
1. `src/lib/products.ts` — Add `gameTypeId` filter to `getProducts()`.
2. `src/components/marketplace/filter-panel.tsx` — Accept and use game-scoped taxonomy.
3. `src/app/api/products/route.ts` — Pass `gameType` slug from query params.

### Changes

**`src/lib/products.ts` (`getProducts`):**
- Add `gameType?: string` (slug) to `ProductFilters`.
- Resolve slug → `gameTypeId` at the start.
- Add `gameTypeId` to the Prisma `where` clause.
- Scope the taxonomy aggregation query (`allProducts` select) to also filter by `gameTypeId`.
- The filter panel's available filters (cardSets, rarities, etc.) should only include values from the current game.

**`src/app/api/products/route.ts`:**
- Read `gameType` from search params.
- Pass to `getProducts({ ...filters, gameType })`.

**`src/components/marketplace/filter-panel.tsx`:**
- The taxonomy options shown in the filter panel come from the `ProductsResponse.filters` data, which is already scoped by game after the change above. No direct changes needed if the API returns game-scoped filter options.

### Steps
1. Write a test for `getProducts` with `gameType` filter (must fail first).
2. Add `gameType` support to `getProducts()`.
3. Update the API route to pass `gameType` from query params.
4. Run `npm run lint`, `npm run type-check`, `npm run test`.

### Verification
- `/api/products?gameType=pokemon` returns only Pokémon products.
- `/api/products?gameType=one-piece` returns only One Piece products.
- Filter panel only shows taxonomy relevant to the selected game.
- `npm run test` passes.

---

## Sub-Task 8: Admin — `/admin/games` Page (CRUD UI)

**Goal:** Create the admin game type management page.

**Files (max 3):**
1. `src/app/admin/(panel)/games/page.tsx` — Admin page with list + create/edit dialog.
2. `src/components/admin/games-manager.tsx` — Client component for game type CRUD.
3. `src/app/admin/(panel)/layout.tsx` or nav config — Add sidebar item.

### Steps
1. Add sidebar nav item for "遊戲管理" pointing to `/admin/games`.
2. Create `src/components/admin/games-manager.tsx`:
   - Lists all game types (name, slug, sort order, active toggle).
   - Create dialog: name, slug (auto-generated), sort order.
   - Edit dialog: name, slug, sort order, active toggle.
   - Delete button with confirmation (shows warning if products/taxonomy linked).
3. Create `src/app/admin/(panel)/games/page.tsx` that renders `<GamesManager />`.
4. Run `npm run lint`, `npm run type-check`.

### Verification
- Admin can create a new game type.
- Admin can edit game type name/slug/order.
- Admin can toggle active/inactive.
- Delete shows warning if products are linked.
- `npm run type-check` passes.

---

## Sub-Task 9: Admin — Taxonomy Page Game Type Filter

**Goal:** Add a game type filter dropdown to the taxonomy admin page.

**Files (max 3):**
1. `src/app/admin/(panel)/taxonomy/page.tsx` or its client component — Add filter dropdown.
2. `src/app/api/taxonomy/route.ts` (or equivalent) — Filter taxonomy by `gameTypeId`.
3. *(If the taxonomy provider needs changes: `src/providers/taxonomy-provider.tsx`)*

### Steps
1. Add game type filter dropdown at the top of the taxonomy admin page.
   - Options: "全部" / "共用" / "Pokémon" / "One Piece" / etc.
   - When a game is selected, only show taxonomy options for that game.
2. Update the taxonomy API to accept `gameTypeId` filter param.
3. When creating a new taxonomy option, pre-fill `gameTypeId` based on the selected filter (or null if "共用/shared").
4. Run `npm run lint`, `npm run type-check`.

### Verification
- Selecting "Pokémon" in the filter shows only Pokémon taxonomy options.
- Creating a new SET_CODE while "One Piece" is selected assigns it to One Piece.
- PRODUCT_TYPE options show regardless of filter (they're shared/null).
- `npm run type-check` passes.

---

## Sub-Task 10: Admin — Product Upload Forms Game Type Dropdown

> **⚠️ CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-006 and this plan. Summarize your progress.

**Goal:** Add a game type dropdown to the admin product upload forms that filters dependent taxonomy.

**Files (max 3):**
1. `src/components/admin/product-edit-dialog.tsx` (or equivalent upload form component) — Add game type dropdown.
2. `src/hooks/use-public-taxonomy.ts` or taxonomy hook — Accept `gameTypeId` to filter options.
3. `src/app/api/admin/products/route.ts` — Accept and store `gameTypeId` on create.

### Steps
1. Add a "遊戲" dropdown at the top of each product upload form (single card, sealed, accessory).
   - Default selection: Pokémon (or the first game type by sort order).
   - Options come from active game types.
2. When game type changes, refetch taxonomy options scoped to that game:
   - Pass `gameTypeId` to the taxonomy hook/API.
   - Set code, rarity, card category dropdowns filter to that game's values.
3. On product create, include `gameTypeId` in the POST request body.
4. Update `src/app/api/admin/products/route.ts` to accept `gameTypeId` and store it on the Product.
5. Run `npm run lint`, `npm run type-check`, `npm run test`.

### Verification
- Selecting "One Piece" in the game dropdown shows One Piece set codes and rarities.
- Creating a product with "One Piece" selected stores the correct `gameTypeId`.
- Existing Pokémon products still display correctly.
- `npm run type-check` and `npm run test` pass.

---

## Sub-Task 11: E2E Smoke Test (Playwright)

**Goal:** Write a Playwright E2E test for the main user flow.

**Files (max 2):**
1. `e2e/game-type.spec.ts` — E2E test file.
2. *(If config needed: `playwright.config.ts` updates.)*

### Test Flow

```
1. Visit /products → should redirect to /products/pokemon
2. Game type tabs are visible (at least "Pokémon")
3. Pokémon products are displayed
4. Search for a term → results are within Pokémon only
5. Filter panel shows Pokémon-specific taxonomy
6. Admin flow (if testable):
   a. Login as admin
   b. Navigate to /admin/games
   c. Create a new game type "Test Game" (slug: test-game)
   d. Verify it appears in the storefront tabs
   e. Navigate to /admin/taxonomy
   f. Filter by "Test Game"
   g. Clean up: delete test game type
```

### Steps
1. Write `e2e/game-type.spec.ts`.
2. Run `npx playwright test e2e/game-type.spec.ts`.
3. Fix any issues.
4. Ensure existing E2E tests still pass: `npx playwright test`.

### Verification
- E2E test passes.
- Existing E2E tests still pass.

---

## Sub-Task 12: Deliverables — PROGRESS.md + PR Description

**Goal:** Write the implementation record.

**Files (max 2):**
1. `docs/PROGRESS-game-type.md` — Context-refresh summary.
2. *(PR description is output to terminal, not a file.)*

### PROGRESS.md Contents

```markdown
# PROGRESS: Game Type System (PLAN-006)

## Summary
Implemented multi-TCG support via GameType system per ADR-006.

## What Was Built
- [x] GameType table + FKs to Product and TaxonomyOption
- [x] Domain layer (CRUD operations)
- [x] Public + admin API endpoints
- [x] Dynamic route /products/[gameType]
- [x] Game type tabs on storefront
- [x] Game-scoped product query + filter panel
- [x] Admin /admin/games CRUD page
- [x] Taxonomy admin game type filter
- [x] Product upload forms game type dropdown
- [x] E2E smoke test

## Discrepancies from ADR-006
(List any deviations with justification.)

## Migration Status
- [x] Local DB migrated
- [ ] Vercel/production DB migrated (manual step)

## Technical Debt
(List any shortcuts, deferred items, or known issues.)
```

### PR Description Template

```
## Summary
Implements ADR-006: Game Type System — multi-TCG support (Pokémon, One Piece, Disney Lorcana).

## Changes
### Schema
- New `GameType` table (id, name, slug, sortOrder, isActive)
- `Product.gameTypeId` (required FK, backfilled to Pokémon)
- `TaxonomyOption.gameTypeId` (nullable FK; null = shared across games)

### Storefront
- Dynamic route `/products/[gameType]` replaces static `/products`
- `/products` redirects to `/products/pokemon`
- Game type tabs at top of marketplace
- Product queries and filter panel scoped by game type

### Admin
- New `/admin/games` page for game type CRUD
- Taxonomy page: game type filter dropdown
- Product upload forms: game type dropdown (filters dependent taxonomy)

### Tests
- Unit: [N] tests in src/lib/__tests__/game-types.test.ts
- API: [N] tests in src/app/api/*/route.test.ts
- E2E: game-type.spec.ts — storefront flow verified

## Migration Required
Run `npx tsx prisma/run-migration-gametype.ts` on production DB.

## Technical Debt
- (List any items here)
```

---

## Manual Smoke Test Steps

After all sub-tasks are complete, the human should manually verify:

### Storefront
1. Go to `/products` → should redirect to `/products/pokemon`.
2. Game type tabs visible at top: **Pokémon** (active), **One Piece**, **Lorcana** (if created).
3. Click "One Piece" tab → URL changes to `/products/one-piece`, filter panel updates.
4. Search "test" on One Piece page → only One Piece products appear.
5. Filter panel only shows One Piece taxonomy (no Pokémon rarities/sets).

### Admin
6. Go to `/admin/games` → see list of game types.
7. Click "Create" → enter "One Piece", slug auto-fills as "one-piece" → save.
8. Go to `/admin/taxonomy` → select "One Piece" in filter → taxonomy list filters.
9. Create a SET_CODE taxonomy option for One Piece (e.g., "OP01") → verify it's assigned to One Piece.
10. Go to product upload form → select "One Piece" in game dropdown → set code/rarity dropdowns show One Piece values.
11. Upload an One Piece product → verify it appears on `/products/one-piece`.
12. Go to `/admin/games` → try to delete "Pokémon" → should show warning (products linked).

### Edge Cases
13. `/products/invalid-game` → should show 404.
14. Existing Pokémon products still appear correctly on `/products/pokemon`.
15. Home page "熱門商品" still shows featured products (unified, any game).
