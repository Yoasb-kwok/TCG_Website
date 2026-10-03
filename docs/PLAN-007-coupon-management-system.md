# PLAN-007: Coupon Management System Implementation Plan

**ADR:** [ADR-007: Coupon Management System](./ADR-007-coupon-management-system.md)
**Branch:** current working branch
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

1. **SPEC LOCK**: You cannot change this plan or the ADR-007 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: You are restricted to editing a maximum of **3 files per sub-task**. Break larger tasks down.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after EVERY file save. You must print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-task #4 and #6, re-read ADR-007 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize writing 1 end-to-end (E2E) smoke test (Playwright) for the main user flow. If the E2E passes, the core logic is solid.

---

## Sub-Task Overview

| # | Sub-Task | Files | Dependency |
|---|----------|-------|------------|
| 1 | Prisma schema: Coupon model + rollback | `schema.prisma`, rollback SQL, migration SQL | — |
| 2 | Migration runner + apply to DB | `prisma/run-migration-coupon.ts` | #1 |
| 3 | Domain layer: coupon CRUD | `src/lib/coupons.ts` + test | #2 |
| 4 | API routes: admin coupon CRUD | 2 route files | #3 |
| 5 | Admin page + sidebar item | admin page, sidebar | #4 |
| 6 | Admin coupons-manager component | `coupons-manager.tsx` | #4, #5 |
| 7 | E2E smoke test | `e2e/coupon.spec.ts` | #3–#6 |
| 8 | Deliverables: PROGRESS.md + PR description | docs | #7 |

---

## Sub-Task 1: Prisma Schema — Coupon Model + Rollback

**Goal:** Add the `Coupon` model to the Prisma schema.

**Files (max 3):**
1. `prisma/schema.prisma` — Add `Coupon` model.
2. `prisma/migrations/rollback/rollback-coupon.sql` — Down migration script.
3. `prisma/migrations/20260816000000_coupon/migration.sql` — Up migration SQL.

### Schema Changes

```prisma
/// ADR-007: Coupon management — standalone record system
model Coupon {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  description String
  quantity    Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Rollback SQL (`rollback-coupon.sql`)

```sql
DROP TABLE IF EXISTS "Coupon";
```

### Steps
1. Add the `Coupon` model to `prisma/schema.prisma`.
2. Write the up migration SQL (`CREATE TABLE`).
3. Write the rollback SQL (`DROP TABLE`).
4. Run `npx prisma generate` to update the client.
5. Run `npm run type-check`.

### Verification
- `npx prisma validate` passes.
- `npx prisma generate` succeeds.
- `npm run type-check` passes.

---

## Sub-Task 2: Migration Runner + Apply to DB

**Goal:** Create a migration runner script and apply the migration to the local database.

**Files (max 2):**
1. `prisma/run-migration-coupon.ts` — Manual SQL runner via `pg.Pool`.
2. *(No other files — the migration SQL and rollback were created in Sub-Task 1.)*

### Steps
1. Create `prisma/run-migration-coupon.ts` following the pattern of `prisma/run-migration-gametype.ts`:
   - Reads `DATABASE_URL` from env.
   - Connects via `pg.Pool`.
   - Checks if the `Coupon` table already exists (idempotent).
   - Executes the migration SQL.
   - Logs success.
2. Run `npx tsx prisma/run-migration-coupon.ts`.
3. Verify the table exists: query `SELECT * FROM "Coupon" LIMIT 1`.

### Verification
- Migration script runs without error.
- `Coupon` table exists in the database.

---

## Sub-Task 3: Domain Layer — Coupon CRUD

**Goal:** Create the domain layer with CRUD operations and unit tests.

> ⚠️ **CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-007 and this plan. Summarize your progress to ensure you haven't drifted from the goal.

**Files (max 3):**
1. `src/lib/coupons.ts` — Domain functions.
2. `src/lib/__tests__/coupons.test.ts` — Vitest unit tests.

### Domain Functions

```typescript
// src/lib/coupons.ts

import { prisma } from "@/lib/prisma";

export interface CouponInput {
  name: string;
  code?: string;        // auto-generated from name if not provided
  description: string;
  quantity: number;
  isActive?: boolean;
}

// Generate a URL-safe code from a name (same pattern as GameType.slug)
export function generateCouponCode(name: string): string;

// CRUD
export async function listCoupons(): Promise<Coupon[]>;
export async function createCoupon(input: CouponInput): Promise<Coupon>;
export async function updateCoupon(id: string, input: Partial<CouponInput>): Promise<Coupon>;
export async function deleteCoupon(id: string): Promise<void>;
```

### Business Rules (from ADR-007)
- `quantity` must be ≥ 0 (throw on negative).
- `code` must be unique (Prisma `@unique` enforces this, but domain layer should give a clear error).
- `code` auto-generates from `name` if not provided.
- `isActive` defaults to `true`.

### Test Cases (must fail initially)

```
describe("generateCouponCode")
  ✓ converts "Summer Sale" → "summer-sale"
  ✓ strips special characters from "夏季 20% Off!" → "20-off"
  ✓ handles empty string → ""

describe("createCoupon")
  ✓ creates a coupon with auto-generated code
  ✓ creates a coupon with explicit code
  ✓ throws if quantity is negative
  ✓ throws if name is empty

describe("updateCoupon")
  ✓ updates quantity
  ✓ updates isActive
  ✓ throws if updated quantity is negative

describe("deleteCoupon")
  ✓ deletes the coupon
  ✓ throws if coupon does not exist
```

### Steps
1. Write the test file first (red — functions don't exist yet).
2. Run `npm run test` — confirm tests fail.
3. Write `src/lib/coupons.ts` to make tests pass (green).
4. Run `npm run test` — confirm tests pass.
5. Run `npm run lint`, `npm run type-check`.

### Verification
- All coupon tests pass.
- `npm run lint` and `npm run type-check` pass.

---

## Sub-Task 4: API Routes — Admin Coupon CRUD

**Goal:** Create REST API endpoints for admin coupon management.

**Files (max 3):**
1. `src/app/api/admin/coupons/route.ts` — GET (list) + POST (create).
2. `src/app/api/admin/coupons/[id]/route.ts` — PATCH (update) + DELETE (delete).

### API Spec

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/admin/coupons` | — | `Coupon[]` |
| POST | `/api/admin/coupons` | `{ name, code?, description, quantity, isActive? }` | `Coupon` (201) |
| PATCH | `/api/admin/coupons/[id]` | `{ name?, code?, description?, quantity?, isActive? }` | `Coupon` |
| DELETE | `/api/admin/coupons/[id]` | — | `{ success: true }` |

### Auth
All endpoints must call `requireAdmin()` from `@/lib/auth-server` (same pattern as `/api/admin/games`).

### Error Handling
- 400: Invalid input (negative quantity, empty name).
- 401: Not authenticated.
- 403: Not admin.
- 409: Duplicate code (Prisma unique constraint violation → friendly message).

### Steps
1. Write `route.ts` (GET + POST) with `requireAdmin()`.
2. Write `[id]/route.ts` (PATCH + DELETE) with `requireAdmin()`.
3. Run `npm run lint`, `npm run type-check`.

### Verification
- `npm run type-check` passes.
- Endpoints return correct status codes (manual test or Playwright in Sub-Task 7).

---

## Sub-Task 5: Admin Page + Sidebar Item

**Goal:** Create the admin coupon page and add the sidebar navigation item.

**Files (max 3):**
1. `src/app/admin/(panel)/coupons/page.tsx` — Admin page that renders `<CouponsManager />`.
2. `src/components/admin/admin-sidebar.tsx` — Add "優惠券" nav item with `Ticket` icon.

### Page

```tsx
// src/app/admin/(panel)/coupons/page.tsx
import { CouponsManager } from "@/components/admin/coupons-manager";

export default function CouponsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">優惠券管理</h1>
      <CouponsManager />
    </div>
  );
}
```

### Sidebar Addition

Add to `LINKS` array in `admin-sidebar.tsx`:
```typescript
{ href: "/admin/coupons", label: "優惠券", icon: Ticket },
```

Import `Ticket` from `lucide-react`.

### Steps
1. Create the admin page.
2. Add the sidebar item.
3. Run `npm run lint`, `npm run type-check`.

### Verification
- `npm run type-check` passes.
- `/admin/coupons` route renders (will be fully tested in Sub-Task 7).

---

## Sub-Task 6: Admin Coupons Manager Component

> ⚠️ **CONTEXT REFRESH:** Before starting this sub-task, re-read ADR-007 and this plan. Summarize your progress to ensure you haven't drifted from the goal.

**Goal:** Create the client-side CRUD component for coupon management.

**Files (max 3):**
1. `src/components/admin/coupons-manager.tsx` — Client component.

### Component Features

**List view (table):**
| Name | Code | Description | Quantity | Status | Actions |
- Name: coupon name
- Code: auto-generated code (read-only display)
- Description: coupon description text
- Quantity: current quantity (with inline edit)
- Status: active/inactive badge (toggle)
- Actions: edit button, delete button

**Create/Edit form:**
- Name (text input, required)
- Code (text input, auto-fills from name, editable — hidden by default, shown via "advanced" toggle)
- Description (textarea with quick-fill buttons)
- Quantity (number input, min 0)
- Active toggle (checkbox)
- Submit / Cancel buttons

**Quick-fill buttons** (populate description textarea):
- "XX% off" → fills "20% off"
- "HK$XX off" → fills "HK$50 off"
- "Buy X Get Y" → fills "Buy 1 Get 1 Free"

**Delete:** Confirmation dialog ("確定要刪除這個優惠券？").

### Steps
1. Create `coupons-manager.tsx` following the pattern of `games-manager.tsx`.
2. Implement list, create form, edit form, delete, toggle active.
3. Run `npm run lint`, `npm run type-check`.

### Verification
- `npm run type-check` passes.
- Component renders without errors (tested in E2E Sub-Task 7).

---

## Sub-Task 7: E2E Smoke Test

**Goal:** Write a Playwright E2E test for the coupon admin flow.

**Files (max 2):**
1. `e2e/coupon.spec.ts` — E2E test file.

### Test Flow

```
1. Admin auth (mocked via setAdminAuth)
2. Mock /api/admin/coupons to return mock coupon list
3. Navigate to /admin/coupons
4. Verify coupon table renders with mock data
5. Verify "新增" (create) button is visible
6. Verify coupon name appears in table
```

### Mock Data

```typescript
const mockCoupons = [
  { id: "c1", name: "Summer Sale", code: "summer-sale", description: "20% off", quantity: 50, isActive: true, createdAt: "...", updatedAt: "..." },
  { id: "c2", name: "Welcome", code: "welcome", description: "HK$50 off first purchase", quantity: 10, isActive: false, createdAt: "...", updatedAt: "..." },
];
```

### Steps
1. Write `e2e/coupon.spec.ts`.
2. Mock `/api/admin/coupons` and `/api/auth/session`.
3. Run `npx playwright test e2e/coupon.spec.ts`.
4. Fix any issues.
5. Ensure existing tests still pass: `npx playwright test`.

### Verification
- E2E test passes.
- Existing E2E tests still pass.

---

## Sub-Task 8: Deliverables — PROGRESS.md + PR Description

**Goal:** Write the implementation record.

**Files (max 2):**
1. `docs/PROGRESS-coupon.md` — Context-refresh summary.

### PROGRESS.md Contents

```markdown
# PROGRESS: Coupon Management System (PLAN-007)

## Summary
Implemented standalone coupon record system per ADR-007.

## What Was Built
- [ ] Coupon table (name, code, description, quantity, isActive)
- [ ] Domain layer (CRUD + generateCouponCode)
- [ ] Admin API endpoints (GET, POST, PATCH, DELETE)
- [ ] Admin /admin/coupons page + sidebar item
- [ ] Coupons manager component (list, create, edit, delete, toggle)
- [ ] Quick-fill description buttons
- [ ] E2E smoke test

## Discrepancies from ADR-007
(List any deviations with justification.)

## Migration Status
- [ ] Local DB migrated
- [ ] Vercel/production DB migrated (manual step)

## Technical Debt
(List any shortcuts, deferred items, or known issues.)
```

### PR Description Template

```
## Summary
Implements ADR-007: Coupon Management System — standalone admin record system.

## Changes
### Schema
- New `Coupon` table (id, name, code, description, quantity, isActive)

### Domain
- `src/lib/coupons.ts` — CRUD + code auto-generation

### API
- GET/POST `/api/admin/coupons`
- PATCH/DELETE `/api/admin/coupons/[id]`

### Admin UI
- `/admin/coupons` page with coupons-manager component
- Sidebar item "優惠券"
- Quick-fill description buttons (20% off, HK$50 off, Buy 1 Get 1)

### Tests
- Unit: [N] tests in src/lib/__tests__/coupons.test.ts
- E2E: coupon.spec.ts

## Migration Required
Run `npx tsx prisma/run-migration-coupon.ts` on production DB.

## Technical Debt
- (List any items here)
```

---

## Manual Smoke Test Steps

After all sub-tasks are complete, the human should manually verify:

### Admin
1. Go to `/admin/coupons` → see empty state or coupon list.
2. Click "新增" → fill in name "Summer Sale", description "20% off", quantity 50 → submit.
3. Verify coupon appears in table with auto-generated code "summer-sale".
4. Click "20% off" quick-fill button → description populates.
5. Click edit → change quantity to 30 → save → verify updated.
6. Toggle active → badge changes from "顯示" to "隱藏".
7. Click delete → confirmation dialog → confirm → coupon removed.

### Edge Cases
8. Try to create a coupon with negative quantity → should show error.
9. Try to create a coupon with empty name → should show error.
10. Try to create a coupon with duplicate code → should show error.
