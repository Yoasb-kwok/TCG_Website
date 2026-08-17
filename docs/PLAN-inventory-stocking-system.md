# Implementation Plan: Inventory Stocking System (ADR-005)

> **Reference:** `docs/ADR-005-inventory-stocking-system.md`
> **Branch:** `feature/Lucas-add-tournament-registration-with-Google-Calendar`

---

## Overview

Rework the product dashboard into a full inventory stocking system with three stock buckets (actual / booked / reserved), state thresholds with a walk-in buffer zone, a stock booking/arrival flow, and two admin dashboards (product focus + record focus). Customers see `actual − criticalThreshold` sellable quantity online; products in critical state are hidden from the storefront.

**Key principle:** The existing `ProductVariant.stock` field becomes "actual." Checkout and webhook code barely changes. All business rules live in `src/lib/inventory.ts`.

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

1. **SPEC LOCK**: You cannot change this plan or the ADR-005 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: You are restricted to editing a maximum of **3 files per sub-task**. Break larger tasks down.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after EVERY file save. You must print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-task #4, #7, and #10, re-read ADR-005 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize writing 1 end-to-end (E2E) smoke test (Playwright) for the main user flow. If the E2E passes, the core logic is solid.

---

## Existing Codebase Context

| Component | Path | Notes |
|-----------|------|-------|
| Prisma schema | `prisma/schema.prisma` | `ProductVariant.stock Int @default(0)` — becomes "actual" |
| Prisma client | `src/lib/prisma.ts` | `getPrisma()`, `isDatabaseConfigured()`. Bump `PRISMA_SCHEMA_VERSION` after schema change. |
| Auth server | `src/lib/auth-server.ts` | `requireAdmin()` returns `{ ok: true, session } \| { ok: false, response }` |
| Checkout | `src/app/api/checkout/route.ts` | Checks `variant.stock < item.quantity` (line 76). Needs buffer zone. |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` | Decrements `variant.stock` on payment (line 96). No change needed. |
| Storefront product query | `src/lib/products.ts` | `getProducts()` — filters by `variantWhere.stock = { gt: 0 }` when inStock. Needs buffer zone. |
| Storefront product card | `src/components/marketplace/product-card.tsx` | `inStock = product.variants.some((v) => v.stock > 0)`. Needs sellable quantity. |
| Admin products page | `src/app/admin/(panel)/products/page.tsx` | Has tabs: single, sealed, list. "list" tab uses `ProductsTable`. |
| Admin products table | `src/components/admin/products-table.tsx` | Inline stock editing, bulk edit, delete. Will be replaced by inventory dashboard. |
| Admin products API | `src/app/api/admin/products/route.ts` | `GET` (paginated list), `POST` (create). |
| Admin products API | `src/app/api/admin/products/[id]/route.ts` | `GET`, `PATCH` (update variant price/stock), `DELETE`. |
| Admin products bulk API | `src/app/api/admin/products/bulk/route.ts` | Bulk PATCH (price/stock), bulk DELETE. |
| Admin sidebar | `src/components/admin/admin-sidebar.tsx` | Nav items. "商品上架" → `/admin/products`. No sidebar changes needed. |

### Migration Pattern
- `prisma migrate deploy` FAILS with P3005 ("database schema is not empty")
- Always use manual SQL via `pg.Pool` script (see `prisma/run-migration-points.ts` for pattern)
- After schema change: run `npx prisma generate` + bump `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts`

### Storefront Stock Check Locations (must apply buffer zone)

| File | Line | Current Logic | New Logic |
|------|------|---------------|-----------|
| `src/app/api/checkout/route.ts` | ~76 | `variant.stock < item.quantity` | `sellable = variant.stock - effectiveCriticalThreshold; if (sellable < item.quantity)` |
| `src/lib/products.ts` | ~253 | `variantWhere.stock = { gt: 0 }` | Must exclude variants where `stock - effectiveCriticalThreshold <= 0` |
| `src/components/marketplace/product-card.tsx` | ~22 | `v.stock > 0` | `getSellableQuantity(v) > 0` |

---

## Sub-tasks

### Sub-task 0: Schema — ProductVariant Fields + StockRecord + ShopSetting + Rollback

**Goal:** Add new fields to `ProductVariant`, create `StockRecord` model, `StockState` enum, `ShopSetting` singleton.

**Files (3 max):**
1. `prisma/schema.prisma` — add fields + models
2. `prisma/migrations/20260814120000_inventory_stocking/migration.sql` — forward migration
3. `prisma/migrations/20260814120000_inventory_stocking/rollback.sql` — rollback

**Schema changes:**

```prisma
// Add to ProductVariant:
model ProductVariant {
  // ... existing fields unchanged ...
  stock              Int     @default(0)    // ACTUAL (field name unchanged)
  bookedStock        Int     @default(0)    // NEW
  reservedStock      Int     @default(0)    // NEW
  reservedNote       String?                // NEW
  lowThreshold       Int?                   // NEW (null = use global)
  criticalThreshold  Int?                   // NEW (null = use global)
  stockRecords       StockRecord[]          // NEW relation
}

// New enum:
enum StockState {
  BOOKED
  ARRIVED
}

// New model:
model StockRecord {
  id          String      @id @default(uuid())
  variantId   String
  variant     ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  quantity    Int
  unitCost    Float
  state       StockState  @default(BOOKED)
  bookedAt    DateTime    @default(now())
  arrivedAt   DateTime?
  arrivalNote String?

  @@index([variantId])
  @@index([state])
}

// New singleton:
model ShopSetting {
  id                       String   @id @default("default")
  defaultLowThreshold      Int      @default(5)
  defaultCriticalThreshold Int      @default(2)
  updatedAt                DateTime @updatedAt
}
```

**Migration SQL:**
```sql
-- Forward
ALTER TABLE "ProductVariant" ADD COLUMN "bookedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "reservedNote" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "lowThreshold" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "criticalThreshold" INTEGER;

CREATE TYPE "StockState" AS ENUM ('BOOKED', 'ARRIVED');

CREATE TABLE "StockRecord" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "state" "StockState" NOT NULL DEFAULT 'BOOKED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3),
    "arrivalNote" TEXT,
    CONSTRAINT "StockRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockRecord_variantId_idx" ON "StockRecord"("variantId");
CREATE INDEX "StockRecord_state_idx" ON "StockRecord"("state");
ALTER TABLE "StockRecord" ADD CONSTRAINT "StockRecord_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE;

CREATE TABLE "ShopSetting" (
    "id" TEXT NOT NULL,
    "defaultLowThreshold" INTEGER NOT NULL DEFAULT 5,
    "defaultCriticalThreshold" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopSetting_pkey" PRIMARY KEY ("id")
);
INSERT INTO "ShopSetting" ("id", "updatedAt") VALUES ('default', NOW());
```

**Rollback SQL:**
```sql
-- Rollback
DROP TABLE IF EXISTS "ShopSetting";
DROP TABLE IF EXISTS "StockRecord";
DROP TYPE IF EXISTS "StockState";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "criticalThreshold";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "lowThreshold";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "reservedNote";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "reservedStock";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "bookedStock";
```

**Steps:**
1. Edit `prisma/schema.prisma` — add all fields + models
2. Write `migration.sql` and `rollback.sql`
3. Run `npx prisma generate`
4. Bump `PRISMA_SCHEMA_VERSION` in `src/lib/prisma.ts` (note: this is a 4th file edit, so split: do schema + migration SQL first, then prisma.ts version bump as a follow-up mini-step within this sub-task)
5. Run migration via `prisma/run-migration-inventory.ts` (copy pattern from `run-migration-points.ts`)

> **Note:** The `PRISMA_SCHEMA_VERSION` bump and `run-migration-inventory.ts` script can be done as part of this sub-task since they're infrastructure, not feature logic. If the 3-file limit is hit, do: (a) schema.prisma + 2 SQL files, then (b) prisma.ts + migration runner script.

---

### Sub-task 1: Domain Service — `src/lib/inventory.ts` (TDD)

**Goal:** Create the inventory domain service with all business rules.

**Files (3 max):**
1. `src/lib/inventory.ts` — domain service
2. `src/lib/__tests__/inventory.test.ts` — unit tests
3. `src/lib/inventory-constants.ts` — browser-safe constants (if needed)

**Functions to implement:**

```typescript
// Threshold resolution
export async function getEffectiveThresholds(
  variant: { lowThreshold: number | null; criticalThreshold: number | null }
): Promise<{ low: number; critical: number }>;
// Returns per-variant override or falls back to ShopSetting defaults

// State calculation
export function getVariantState(
  actual: number,
  low: number,
  critical: number
): "healthy" | "low" | "critical";
// actual > low → healthy; critical <= actual <= low → low; actual < critical → critical

// Sellable quantity (buffer zone)
export function getSellableQuantity(
  actual: number,
  critical: number
): number;
// Returns max(0, actual - critical)

// Reserve
export async function reserveStock(
  variantId: string,
  quantity: number,
  note?: string
): Promise<{ fromActual: number; fromBooked: number }>;
// Priority: actual first, then booked. Error if both insufficient.

// Un-reserve (returns to actual)
export async function unreserveStock(
  variantId: string,
  quantity: number
): Promise<void>;

// Clear all reserved
export async function clearReservedStock(variantId: string): Promise<void>;

// Manual adjust actual
export async function manualAdjustActual(
  variantId: string,
  delta: number
): Promise<void>;
// delta > 0 = increase, delta < 0 = decrease. Floors at 0.

// Create stock record (stock button)
export async function createStockRecord(
  variantId: string,
  quantity: number,
  unitCost: number
): Promise<string>;
// Creates StockRecord (BOOKED), increments variant.bookedStock

// Arrive stock record (toggle)
export async function arriveStockRecord(
  recordId: string,
  arrivedAt: Date,
  note?: string
): Promise<void>;
// Sets state ARRIVED, decrements bookedStock, increments stock (actual)
```

**Tests to write (must fail first):**

```
getVariantState:
  ✓ returns "healthy" when actual > low
  ✓ returns "low" when critical <= actual <= low
  ✓ returns "critical" when actual < critical
  ✓ handles boundary: actual == low → low
  ✓ handles boundary: actual == critical → low (critical <= actual)

getSellableQuantity:
  ✓ returns actual - critical when positive
  ✓ returns 0 when actual <= critical
  ✓ returns 0 when actual == critical

reserveStock:
  ✓ reserves from actual first (actual decreases, reserved increases)
  ✓ reserves from booked when actual is 0
  ✓ reserves from both when actual is insufficient
  ✓ throws when both actual and booked are insufficient
  ✓ updates reservedNote when provided

unreserveStock:
  ✓ returns quantity to actual (reserved decreases, actual increases)
  ✓ throws when trying to unreserve more than reserved

clearReservedStock:
  ✓ sets reserved to 0, returns all to actual
  ✓ does nothing if reserved is already 0

manualAdjustActual:
  ✓ increases actual by delta
  ✓ decreases actual by delta
  ✓ floors at 0 (does not go negative)

createStockRecord:
  ✓ creates StockRecord with state BOOKED
  ✓ increments variant.bookedStock by quantity

arriveStockRecord:
  ✓ sets state to ARRIVED, fills arrivedAt
  ✓ decrements bookedStock, increments stock
  ✓ stores arrivalNote when provided
  ✓ throws if record already ARRIVED (one-way)
```

---

### Sub-task 2: Inventory API — `GET /api/admin/inventory` + `PATCH /api/admin/inventory/[variantId]`

**Goal:** API endpoints for the product focus dashboard.

**Files (3 max):**
1. `src/app/api/admin/inventory/route.ts` — GET (list variants grouped by product, ranked by state)
2. `src/app/api/admin/inventory/[variantId]/route.ts` — PATCH (manual adjust)
3. `src/app/api/admin/inventory/route.test.ts` — tests (covers both)

**GET /api/admin/inventory:**
- Query params: `search`, `type`, `setCode`, `rarityTier`, `state` (critical/low/healthy), `page`
- Returns variants with: name, condition, isFoil, actual, booked, reserved, total, state, thresholds
- Grouped by parent product
- Ranked: critical → low → healthy (within each product)

**PATCH /api/admin/inventory/[variantId]:**
```typescript
// Body:
{ action: "increase" | "decrease" | "reserve" | "unreserve" | "clearReserved"
  quantity?: number   // required for all except clearReserved
  note?: string }     // optional for reserve
```

**Tests:**
```
GET /api/admin/inventory:
  ✓ returns 401 without admin auth
  ✓ returns variants with stock data grouped by product
  ✓ filters by state (critical/low/healthy)
  ✓ filters by search (product name)
  ✓ ranks critical before low before healthy

PATCH /api/admin/inventory/[variantId]:
  ✓ returns 401 without admin auth
  ✓ action=increase: adds to actual
  ✓ action=decrease: subtracts from actual
  ✓ action=reserve: calls reserveStock
  ✓ action=unreserve: calls unreserveStock
  ✓ action=clearReserved: calls clearReservedStock
  ✓ returns 400 for invalid action
```

---

### Sub-task 3: Stock API — `POST /api/admin/stock` + `GET/PATCH /api/admin/stock-records`

**Goal:** API endpoints for the stock entry page and record dashboard.

**Files (3 max):**
1. `src/app/api/admin/stock/route.ts` — POST (create StockRecord)
2. `src/app/api/admin/stock-records/route.ts` — GET (list records) + `src/app/api/admin/stock-records/[id]/route.ts` — PATCH (toggle arrived)
3. `src/app/api/admin/stock/route.test.ts` — tests

> **Note:** If 3-file limit is hit, split into two sub-tasks: (a) POST stock + test, (b) GET/PATCH stock-records + test.

**POST /api/admin/stock:**
```typescript
// Body: { variantId: string, quantity: number, unitCost: number }
// Calls createStockRecord(), returns { recordId }
```

**GET /api/admin/stock-records:**
- Query params: `search` (product name), `state` (BOOKED/ARRIVED), `page`
- Returns records joined with variant + product for display

**PATCH /api/admin/stock-records/[id]:**
```typescript
// Body: { arrivedAt: string (ISO), note?: string }
// Calls arriveStockRecord(), returns { ok: true }
```

**Tests:**
```
POST /api/admin/stock:
  ✓ returns 401 without admin auth
  ✓ creates StockRecord and increments bookedStock
  ✓ returns 400 for missing fields
  ✓ returns 400 for invalid variantId

GET /api/admin/stock-records:
  ✓ returns 401 without admin auth
  ✓ returns records with product name
  ✓ filters by state (BOOKED / ARRIVED)
  ✓ filters by search (product name)

PATCH /api/admin/stock-records/[id]:
  ✓ returns 401 without admin auth
  ✓ toggles BOOKED → ARRIVED, transfers booked→actual
  ✓ stores arrivalNote
  ✓ returns 409 if already ARRIVED
```

---

### Sub-task 4: Shop Settings API — `GET/PATCH /api/admin/shop-settings`

> **🔄 CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-005 and this plan. Summarize progress: Sub-tasks 0–3 are complete (schema, domain service, inventory API, stock/record API). Next: global threshold settings, then storefront buffer zone, then UI.

**Goal:** API endpoints for global threshold defaults.

**Files (2):**
1. `src/app/api/admin/shop-settings/route.ts` — GET + PATCH
2. `src/app/api/admin/shop-settings/route.test.ts` — tests

**GET /api/admin/shop-settings:**
- Returns `{ defaultLowThreshold: number, defaultCriticalThreshold: number }`
- Falls back to creating the singleton row if it doesn't exist

**PATCH /api/admin/shop-settings:**
```typescript
// Body: { defaultLowThreshold?: number, defaultCriticalThreshold?: number }
// Updates the singleton row
// Validates: defaultCriticalThreshold >= 0, defaultLowThreshold > defaultCriticalThreshold
```

**Tests:**
```
GET /api/admin/shop-settings:
  ✓ returns 401 without admin auth
  ✓ returns current thresholds (creates singleton if missing)
  ✓ returns defaults { low: 5, critical: 2 } on first call

PATCH /api/admin/shop-settings:
  ✓ returns 401 without admin auth
  ✓ updates defaultLowThreshold
  ✓ updates defaultCriticalThreshold
  ✓ returns 400 if low <= critical
  ✓ returns 400 for negative values
```

---

### Sub-task 5: Storefront Buffer Zone — Checkout + Product Query

**Goal:** Apply the buffer zone (`actual − criticalThreshold`) to checkout and the storefront product listing.

**Files (3 max):**
1. `src/app/api/checkout/route.ts` — change stock check to use sellable quantity
2. `src/lib/products.ts` — change inStock filter to use sellable quantity
3. `src/components/marketplace/product-card.tsx` — show sellable quantity

> **⚠️ CRITICAL:** This sub-task changes customer-facing behavior. Products in critical state will be hidden. Test thoroughly.

**Checkout change** (`src/app/api/checkout/route.ts` ~line 76):
```typescript
// BEFORE:
if (variant.stock < item.quantity) {
  throw new Error(`${variant.product.name} 庫存不足（剩餘 ${variant.stock}）`);
}

// AFTER:
const critical = variant.criticalThreshold ?? defaultCriticalThreshold;
const sellable = variant.stock - critical;
if (sellable < item.quantity) {
  throw new Error(`${variant.product.name} 庫存不足（可售 ${sellable}）`);
}
```

**Product query change** (`src/lib/products.ts` ~line 253):
```typescript
// BEFORE:
if (filters.inStock) variantWhere.stock = { gt: 0 };

// AFTER:
// Must fetch ShopSetting for default thresholds, then filter
// Products with ALL variants at critical state are excluded
// This requires a post-query filter or a raw SQL approach
```

> **Note:** The product query buffer zone is complex because thresholds can be per-variant OR global. Two approaches:
> - **(a)** Post-query filter: fetch products, compute sellable for each variant, filter in JS (simple but slower)
> - **(b)** Raw SQL subquery with COALESCE for thresholds (fast but complex)
> - Recommend (a) for correctness first, optimize later if performance issues.

**Product card change** (`src/components/marketplace/product-card.tsx`):
- `inStock` check uses sellable quantity (actual − critical) instead of raw stock
- Add small badge "補貨中 (+N)" when `bookedStock > 0`

**Tests:**
```
checkout buffer zone:
  ✓ blocks purchase when sellable < requested quantity
  ✓ allows purchase when sellable >= requested quantity
  ✓ uses per-variant threshold override
  ✓ falls back to global default when variant threshold is null

product query buffer zone:
  ✓ hides products where all variants have sellable <= 0
  ✓ shows products with at least one sellable variant
```

---

### Sub-task 6: Inventory Dashboard UI — Product Focus Tab

**Goal:** Build the product focus dashboard that replaces the old "已上架商品" tab.

**Files (3 max):**
1. `src/components/admin/inventory-dashboard.tsx` — main table component
2. `src/components/admin/inventory-reserve-dialog.tsx` — reserve input dialog
3. `src/app/admin/(panel)/products/page.tsx` — update tabs

> **Note:** If 3-file limit is hit, split reserve dialog into next sub-task.

**Inventory dashboard table:**

| Column | Content | Interaction |
|--------|---------|-------------|
| Name | Product name + variant (condition/foil) | Click → detail modal |
| Actual | `stock` value | ↑ increase, ↓ decrease buttons |
| Booked | `bookedStock` value | "+" → navigate to `/admin/products/stock` |
| Reserved | `reservedStock` value | "+" → reserve dialog; "edit" → decrease/clear |
| Total | `stock + bookedStock + reservedStock` | Computed, read-only |
| State | Color badge (red/amber/green) | Click → threshold settings |
| Delete | 🗑 icon | Warning dialog → DELETE product |

**Features:**
- Search bar (product name)
- Filters: type, setCode, rarityTier (existing) + state (critical/low/healthy)
- Ranking: critical → low → healthy
- Pagination

**Reserve dialog:**
- Input: quantity to reserve
- Optional: note (e.g., "walk-in Mr. Chan")
- Calls `PATCH /api/admin/inventory/[variantId]` with `{ action: "reserve", quantity, note }`

**Threshold settings modal:**
- Shows current per-variant thresholds (or "using global default")
- Inputs: lowThreshold, criticalThreshold
- Description text explaining the buffer zone
- Save → `PATCH /api/admin/inventory/[variantId]` (or a dedicated threshold endpoint)

---

### Sub-task 7: Record Dashboard UI — Record Focus Tab

> **🔄 CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-005 and this plan. Summarize progress: Sub-tasks 0–6 are complete (schema, domain service, all APIs, storefront buffer zone, inventory dashboard). Next: record dashboard, stock entry page, threshold settings on upload forms, then E2E.

**Goal:** Build the record focus dashboard tab.

**Files (2):**
1. `src/components/admin/record-dashboard.tsx` — record table + arrival form
2. `src/app/admin/(panel)/products/page.tsx` — add "入貨記錄" tab (if not already done in sub-task 6)

**Record dashboard table:**

| Column | Content |
|--------|---------|
| Product | Name + variant detail |
| Quantity | Booking quantity |
| Unit Cost | Cost price |
| Booked At | Date/time of booking |
| State | "抵達" (ARRIVED) / "運送中" (BOOKED) toggle |
| Arrived At | Date or "—" |

**Arrival form (when toggling BOOKED → ARRIVED):**
- Required: arrival date/time (default: now)
- Optional: remark
- Submit → `PATCH /api/admin/stock-records/[id]` with `{ arrivedAt, note }`

**Features:**
- Search (product name)
- Filter: state (arriving/arrived)
- Pagination

---

### Sub-task 8: Stock Entry Page — `/admin/products/stock`

**Goal:** Create the stock entry form page reached from the Stock button.

**Files (2):**
1. `src/app/admin/(panel)/products/stock/page.tsx` — stock entry form
2. `src/app/admin/(panel)/products/stock/page.test.ts` — basic render test

**Form fields:**
- Product/variant selector (dropdown of existing variants, searchable)
- Quantity (integer, min 1)
- Unit cost (float, the cost price per unit)
- Submit → `POST /api/admin/stock` with `{ variantId, quantity, unitCost }`
- On success: redirect back to inventory dashboard, show confirmation toast

---

### Sub-task 9: Threshold Settings on Upload Forms + Detail View-Only

**Goal:** Add threshold fields to product upload forms. Add a view-only detail modal for quantity fields.

**Files (3 max):**
1. `src/components/admin/manual-single-form.tsx` — add lowThreshold + criticalThreshold inputs
2. `src/components/admin/sealed-accessory-form.tsx` — add threshold inputs
3. `src/components/admin/product-detail-modal.tsx` — view-only variant detail (same as edit but quantity read-only)

> **Note:** Upload form threshold fields are optional. Label: "低水位（留空使用全局預設）" and "臨界水位（留空使用全局預設）". Include tooltip explaining the buffer zone.

---

### Sub-task 10: E2E Smoke Tests (Playwright)

> **🔄 CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-005 and this plan. Summarize progress: Sub-tasks 0–9 are complete (schema, domain service, all APIs, storefront buffer zone, both dashboards, stock entry page, threshold settings). Next: E2E tests, then deliverables.

**Goal:** End-to-end tests for the main inventory flows.

**Files (2):**
1. `e2e/inventory.spec.ts` — Playwright E2E tests
2. (uses existing `e2e/auth-helpers.ts` for admin auth)

**E2E test scenarios:**

```
Inventory Dashboard:
  ✓ loads and shows variants with stock data
  ✓ increase actual quantity via ↑ button
  ✓ decrease actual quantity via ↓ button
  ✓ reserve via dialog → reserved increases, actual decreases
  ✓ state badge shows correct color (critical=red, low=amber, healthy=green)

Record Dashboard:
  ✓ stock entry page creates a record
  ✓ record appears in record dashboard with state "運送中"
  ✓ toggle arrived → state changes to "抵達", booked decreases, actual increases

Storefront Buffer Zone:
  ✓ product with sellable > 0 is visible
  ✓ product with sellable = 0 (critical) is hidden from storefront
  ✓ checkout blocks when quantity exceeds sellable
```

> **Note:** E2E tests should mock API responses via `page.route()` where possible, similar to existing E2E tests in the codebase.

---

### Sub-task 11: Deliverables — PROGRESS.md + PR Description + Smoke Test Steps

**Goal:** Create the implementation record comparing final code against ADR-005.

**Files (2):**
1. `PROGRESS-inventory.md` — compliance check + discrepancies
2. PR description (output to terminal)

**PROGRESS-inventory.md must include:**
- ADR-005 decision compliance table (all 9 decisions: status + notes)
- Sub-task completion summary table
- Test results table (Vitest count, Playwright count, TypeScript, ESLint)
- Discrepancies (approved adjustments)
- Pending post-deployment actions

**PR Description must include:**
- Summary of every file changed and why
- Tests added and results
- Technical debt introduced
- Migration required (post-deploy)

**Manual smoke test steps for the human:**
1. Go to `/admin/products` → click "庫存管理" tab → verify variants load with stock data
2. Click ↑ on actual quantity → verify it increases
3. Click ↓ on actual quantity → verify it decreases
4. Click "+" on reserve → enter quantity → verify reserved increases, actual decreases
5. Click "edit" on reserve → clear → verify reserved returns to actual
6. Click "+" on booked → navigate to stock page → fill form → submit → verify booked increases
7. Go to "入貨記錄" tab → verify new record appears as "運送中"
8. Click toggle on record → fill arrival form → submit → verify state is "抵達", booked decreased, actual increased
9. Check storefront → verify products with sellable > 0 are visible, critical products are hidden
10. Go to product upload form → verify threshold fields are present with description
11. Test checkout → verify buffer zone prevents overselling

---

## Dependency Graph

```
Sub-task 0 (Schema)
    │
    ├── Sub-task 1 (Domain Service) ──────┐
    │                                     │
    ├── Sub-task 2 (Inventory API)        │
    │                                     │
    ├── Sub-task 3 (Stock/Record API)     │
    │                                     │
    └── Sub-task 4 (Shop Settings API)    │
                                          │
                                          ├── Sub-task 5 (Storefront Buffer Zone)
                                          │
                                          ├── Sub-task 6 (Inventory Dashboard UI)
                                          │
                                          ├── Sub-task 7 (Record Dashboard UI)
                                          │
                                          ├── Sub-task 8 (Stock Entry Page)
                                          │
                                          └── Sub-task 9 (Threshold on Upload Forms)
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
- [ ] Verify `ShopSetting` singleton row exists (migration inserts it)
- [ ] No new env vars needed for this feature
- [ ] Verify storefront product visibility after deploy (buffer zone may hide some products)

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Buffer zone hides too many products | Medium | Start with low criticalThreshold (e.g., 2); monitor storefront |
| Prisma client not regenerated | High (happened before) | Always run `npx prisma generate` + bump `PRISMA_SCHEMA_VERSION` |
| `bookedStock` drifts from StockRecord sums | Low | Keep all mutations in domain service; add reconciliation check in tests |
| Reserve from booked → un-reserve edge case | Low | Documented in ADR-005; admin manually corrects if needed |
| Storefront query performance with threshold lookup | Low | Post-query JS filter for now; raw SQL optimization if needed |
| Old ProductsTable removed breaks existing admin flow | Medium | Keep ProductsTable component file but don't render it; can restore if needed |

---

## Manual Smoke Test Steps

After implementation is complete:

1. **Inventory dashboard:** Go to `/admin/products` → "庫存管理" tab → verify variants load with actual/booked/reserved/total/state columns
2. **Actual increase:** Click ↑ on a variant → verify actual increases by 1
3. **Actual decrease:** Click ↓ on a variant → verify actual decreases by 1
4. **Reserve:** Click "+" on reserve → enter quantity (e.g., 2) → verify reserved increases, actual decreases
5. **Un-reserve:** Click "edit" on reserve → decrease → verify reserved returns to actual
6. **Clear reserved:** Click "edit" on reserve → clear all → verify reserved = 0, actual increased
7. **Stock entry:** Click "+" on booked → navigate to stock page → select variant, enter quantity + cost → submit → verify booked increases
8. **Record dashboard:** Go to "入貨記錄" tab → verify the new record appears as "運送中"
9. **Arrival toggle:** Click toggle on the record → fill arrival time → submit → verify "抵達", booked decreased, actual increased
10. **State badges:** Verify colors: critical (red), low (amber), healthy (green)
11. **State ranking:** Verify dashboard rows are ordered critical → low → healthy
12. **Storefront visibility:** Visit storefront → verify critical products (sellable ≤ 0) are hidden
13. **Storefront quantity:** Verify displayed quantity matches `actual − criticalThreshold`
14. **Checkout buffer:** Try to buy more than sellable quantity → verify error message
15. **Threshold settings:** Click state badge → set custom thresholds → verify state recalculates
16. **Upload form:** Go to product upload → verify threshold fields with description text
17. **Global settings:** Update global thresholds via settings → verify products without overrides use new defaults
18. **Delete product:** Click delete → verify warning → confirm → verify product is removed
