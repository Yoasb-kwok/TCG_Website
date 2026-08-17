# Implementation Plan: Transaction Management System

**ADR:** [ADR-003](./ADR-003-transaction-management-system.md)
**Branch:** `feature/transaction-management-system`
**Status:** Not started

---

## Overview

Build a unified transaction management dashboard that shows all financial transactions (product orders + tournament registrations) in one place, with receipt generation, search/filter/sort, status/remark editing, and email receipt re-sending.

This plan follows ADR-003's 13 decisions and the user's mandatory rules (TDD, rollback scripts, static checks, atomic commits, circuit breaker, context refresh, integration first).

---

## Mandatory Actions BEFORE Writing Feature Code

These rules apply to **every sub-task**.

### 1. Write Failing Tests First (TDD)
- Write unit/integration tests (Vitest) that precisely describe the expected behavior of the new feature.
- These tests **must fail** initially (red).
- Write the minimum code to make them pass (green).
- Then refactor.

### 2. Create Rollback Scripts
- If the sub-task involves database schema changes, generate the **"down" migration** (rollback script) *before* writing the feature logic.
- Prisma doesn't have native down migrations — create a manual SQL script in `prisma/migrations/rollback/`.

### 3. Enforce Static Checks
- `npm run lint`, `npm run type-check`, and `npm run test` must pass after every file save.
- Print terminal output as proof. Do not assume they pass.

---

## HARD RULES FOR THE IMPLEMENTING AGENT

1. **SPEC LOCK**: You cannot change this plan or the ADR-003 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: You are restricted to editing a maximum of **3 files per sub-task**. Break larger tasks down.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after EVERY file save. You must print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-task #4, #7, and #10, re-read ADR-003 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize writing 1 end-to-end (E2E) smoke test (Playwright) for the main user flow. If the E2E passes, the core logic is solid.

---

## Existing Codebase Context

| Component | Path | Notes |
|-----------|------|-------|
| Prisma schema | `prisma/schema.prisma` | `OrderStatus` enum at line 10; `Order` at line 212; `TournamentRegistration` at line 256 |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` | Handles `checkout.session.completed` — product orders + tournament registrations |
| Admin orders API | `src/app/api/admin/orders/route.ts` | GET list with status filter + pagination |
| Admin orders PATCH | `src/app/api/admin/orders/[id]/route.ts` | Updates order status |
| Admin orders UI | `src/app/admin/(panel)/orders/page.tsx` | Current dashboard — will be augmented/replaced |
| Admin sidebar | `src/components/admin/admin-sidebar.tsx` | 7 nav items, "交易紀錄" at line 26 |
| Email service | `src/lib/email.ts` | `sendOrderReceipt()` at line 74; uses `@react-email/render` + Gmail SMTP |
| Order receipt email | `src/emails/order-receipt.tsx` | Existing receipt template (ORDER only) |
| Tournament register API | `src/app/api/tournaments/register/route.ts` | Creates TournamentRegistration + Stripe session |
| Auth server | `src/lib/auth-server.ts` | `requireAdmin()` for admin API protection |
| Test infra | Vitest + jsdom + Playwright | Test files in `src/**/*.test.ts`, E2E in `e2e/*.spec.ts` |
| DB migration approach | Manual SQL via `pg.Pool` | `prisma migrate deploy` fails with P3005 (non-empty DB). Tables created manually. |

---

## Sub-tasks

### Sub-task 0: Schema Changes — Transaction Table + Enums + Rollback Script

**Files (3):**
1. `prisma/schema.prisma` — Add `FAILED`, `NOT_REQUIRED` to `OrderStatus`; add `Transaction` model + `TransactionType` + `BuyerType` enums
2. `prisma/migrations/20260812000000_transaction_table/migration.sql` — Forward migration
3. `prisma/migrations/20260812000000_transaction_table/rollback.sql` — Rollback script

**Schema additions:**

```prisma
// Add to existing OrderStatus enum:
// FAILED
// NOT_REQUIRED

enum TransactionType {
  ORDER
  TOURNAMENT
}

enum BuyerType {
  USER
  GUEST
}

model Transaction {
  id           String           @id @default(uuid())
  type         TransactionType
  referenceId  String
  buyerType    BuyerType
  email        String
  customerName String?
  description  String
  amount       Float
  status       OrderStatus      @default(PENDING)
  remark       String?
  receiptData  Json?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([type])
  @@index([status])
  @@index([buyerType])
  @@index([createdAt])
  @@index([email])
}
```

**Forward migration SQL:**
```sql
-- Extend OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'NOT_REQUIRED';

-- Create enums
CREATE TYPE "TransactionType" AS ENUM ('ORDER', 'TOURNAMENT');
CREATE TYPE "BuyerType" AS ENUM ('USER', 'GUEST');

-- Create Transaction table
CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type" "TransactionType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "buyerType" "BuyerType" NOT NULL,
  "email" TEXT NOT NULL,
  "customerName" TEXT,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "remark" TEXT,
  "receiptData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_buyerType_idx" ON "Transaction"("buyerType");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE INDEX "Transaction_email_idx" ON "Transaction"("email");
```

**Rollback SQL:**
```sql
DROP TABLE IF EXISTS "Transaction";
DROP TYPE IF EXISTS "TransactionType";
DROP TYPE IF EXISTS "BuyerType";
-- Cannot remove enum values in PostgreSQL. FAILED and NOT_REQUIRED
-- will remain in OrderStatus but are harmless if unused.
```

**Steps:**
1. Write `rollback.sql` FIRST (before anything else)
2. Write `migration.sql`
3. Update `prisma/schema.prisma`
4. Run migration via `pg.Pool` script (NOT `prisma migrate deploy`)
5. Run `npx prisma generate` to update the client
6. Run `npm run type-check` — must pass
7. Commit

**Done when:** `npx prisma generate` succeeds, `npm run type-check` passes, and a `SELECT * FROM "Transaction" LIMIT 1` query works in the database.

---

### Sub-task 1: TypeScript Types — Receipt Discriminated Union + Transaction Types

**Files (2):**
1. `src/lib/transaction-types.ts` — Type definitions
2. `src/lib/transaction-types.test.ts` — Type-level tests (compile-time correctness)

**Types to define (from ADR-003 Decision 11):**

```typescript
export type OrderReceiptData = {
  type: "ORDER";
  orderId: string;
  email: string;
  items: { name: string; condition: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  date: string;
};

export type TournamentReceiptData = {
  type: "TOURNAMENT";
  tournamentTitle: string;
  playerName: string;
  entryFee: number;
  startsAt: string;
  location: string;
  date: string;
};

export type ReceiptData = OrderReceiptData | TournamentReceiptData;

// For admin dashboard display
export type TransactionRow = {
  id: string;
  type: "ORDER" | "TOURNAMENT";
  referenceId: string;
  buyerType: "USER" | "GUEST";
  email: string;
  customerName: string | null;
  description: string;
  amount: number;
  status: string;
  remark: string | null;
  receiptData: ReceiptData | null;
  createdAt: string;
};

// Tournament statuses restricted per ADR-003 Decision 9
export const TOURNAMENT_STATUSES = ["PENDING", "PAID", "CANCELLED", "FAILED", "NOT_REQUIRED"] as const;
export const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED", "FAILED", "NOT_REQUIRED"] as const;
```

**Done when:** `npm run type-check` passes. Tests verify type narrowing works correctly.

---

### Sub-task 2: Domain Service — Transaction Creation (TDD)

**Files (3):**
1. `src/lib/__tests__/transactions.test.ts` — Failing tests
2. `src/lib/transactions.ts` — Domain service
3. `src/lib/transaction-types.ts` — (already created in sub-task 1, may need minor additions)

**Test cases (write FIRST, must fail):**

```
describe("createOrderTransaction", () => {
  it("creates a Transaction row from a PAID order with items")
  it("sets buyerType to USER when order.userId is present")
  it("sets buyerType to GUEST when order.userId is null")
  it("sets customerName to User.name for registered users")
  it("sets customerName to null for guests")
  it("builds receiptData snapshot from order items")
  it("sets description from product names")
  it("does NOT create duplicate if Transaction already exists for this order")
})

describe("createTournamentTransaction", () => {
  it("creates a Transaction row from a PAID tournament registration")
  it("sets customerName to playerName (always present)")
  it("builds receiptData snapshot with tournament details")
  it("does NOT create duplicate if Transaction already exists for this registration")
})
```

**Service functions:**

```typescript
// src/lib/transactions.ts
export async function createOrderTransaction(orderId: string): Promise<void>
export async function createTournamentTransaction(registrationId: string): Promise<void>
export async function buildOrderReceiptData(order: OrderWithItems): Promise<OrderReceiptData>
export async function buildTournamentReceiptData(registration: RegistrationWithTournament): Promise<TournamentReceiptData>
```

**Key logic:**
- `createOrderTransaction`: Fetch order with items + variant + product. Check if Transaction already exists (`findFirst({ where: { type: "ORDER", referenceId: orderId } })`). If yes, skip (idempotent). If no, compute `buyerType`, `customerName`, `description` (product names joined), `receiptData`, then `transaction.create()`.
- `createTournamentTransaction`: Same pattern. Fetch registration + tournament. Check existing. Build snapshot. Create.
- Both are idempotent — safe to call multiple times (e.g., webhook retry + admin manual).

**Done when:** All tests pass. `npm run lint && npm run type-check && npm run test` all green.

---

### Sub-task 3: Receipt Email Template (React Email)

**Files (2):**
1. `src/emails/receipt.tsx` — Shared receipt template (discriminated union)
2. `src/emails/receipt.test.tsx` — Render test

**Template structure (from ADR-003 Decision 3 + 11):**

```tsx
export function ReceiptEmail({ data }: { data: ReceiptData }) {
  if (data.type === "ORDER") {
    return <OrderReceiptLayout {...data} />;
  }
  return <TournamentReceiptLayout {...data} />;
}
```

The ORDER layout reuses the existing `OrderReceiptEmail` styling from `src/emails/order-receipt.tsx`. The TOURNAMENT layout shows: tournament title, player name, entry fee, date/time, location.

**Test:**
- Renders ORDER receipt without error
- Renders TOURNAMENT receipt without error
- ORDER receipt contains item names
- TOURNAMENT receipt contains tournament title

**Done when:** Tests pass, `npm run type-check` green.

---

### ═════════════════════════════════════════════════════
### ⚡ CONTEXT REFRESH #1 — Before starting Sub-task 4
### Re-read ADR-003. Summarize progress:
### - Schema done, types done, domain service done, receipt template done
### - Remaining: API endpoints, webhook integration, UI, backfill, E2E
### ═════════════════════════════════════════════════════

---

### Sub-task 4: API — GET /api/admin/transactions (List with Search/Filter/Sort)

**Files (3):**
1. `src/app/api/admin/transactions/route.ts` — GET handler
2. `src/app/api/admin/transactions/route.test.ts` — Tests
3. (if needed) helper in `src/lib/transactions.ts` for query building

**Query parameters:**

| Param | Type | Purpose |
|-------|------|---------|
| `search` | string | Match against `email` OR `customerName` OR `description` (ILIKE) |
| `status` | string | Filter by status |
| `type` | `ORDER` \| `TOURNAMENT` | Filter by transaction type |
| `buyerType` | `USER` \| `GUEST` | Filter by buyer type |
| `sort` | `date` \| `amount` | Sort field (default: `date`) |
| `order` | `asc` \| `desc` | Sort direction (default: `desc`) |
| `page` | number | Pagination (default: 1, 30 per page) |

**Test cases:**
```
it("returns 401 without admin auth")
it("returns paginated transactions")
it("filters by status")
it("filters by type (ORDER vs TOURNAMENT)")
it("filters by buyerType (USER vs GUEST)")
it("searches by email")
it("searches by customerName")
it("searches by description")
it("sorts by date descending (default)")
it("sorts by amount descending")
it("returns empty array when no matches")
```

**Done when:** All tests pass, `npm run lint && npm run type-check && npm run test` green.

---

### Sub-task 5: API — PATCH /api/admin/transactions/[id] (Update Status/Remark)

**Files (2):**
1. `src/app/api/admin/transactions/[id]/route.ts` — PATCH handler
2. `src/app/api/admin/transactions/[id]/route.test.ts` — Tests

**Request body:**
```typescript
{ status?: string; remark?: string }
```

**Behavior (ADR-003 Decision 5 — unconstrained transitions):**
- Any status → any status (no validation)
- Remark is free-text, nullable
- Returns updated transaction

**Test cases:**
```
it("returns 401 without admin auth")
it("updates status")
it("updates remark")
it("updates both status and remark")
it("returns 404 for non-existent transaction")
it("allows any status transition (unconstrained)")
```

**Done when:** Tests pass, static checks green.

---

### Sub-task 6: API — POST /api/admin/transactions (Manual Offline Transaction)

**Files (2):**
1. `src/app/api/admin/transactions/route.ts` — Add POST handler (same file as sub-task 4)
2. Update test file from sub-task 4

**Request body:**
```typescript
{
  type: "ORDER" | "TOURNAMENT";
  referenceId: string;
  email: string;
  customerName?: string;
  description: string;
  amount: number;
  status?: string;        // default: NOT_REQUIRED (ADR-003 Decision 8)
  remark?: string;
}
```

**Behavior:**
- `buyerType` is inferred: check if `User` exists with this email → `USER`, else `GUEST`
- `status` defaults to `NOT_REQUIRED` (offline transaction)
- No `receiptData` (manual transactions don't have automated receipts)

**Test cases:**
```
it("returns 401 without admin auth")
it("creates a manual transaction with NOT_REQUIRED status")
it("sets buyerType to USER when email matches a registered user")
it("sets buyerType to GUEST for unknown email")
it("returns 400 when required fields are missing")
```

**Done when:** Tests pass, static checks green.

---

### ═════════════════════════════════════════════════════
### ⚡ CONTEXT REFRESH #2 — Before starting Sub-task 7
### Re-read ADR-003. Summarize progress:
### - All 3 admin API endpoints done (GET/PATCH/POST)
### - Remaining: receipt endpoints, webhook integration, UI, backfill, E2E
### ═════════════════════════════════════════════════════

---

### Sub-task 7: API — Receipt Render + Send Receipt Endpoints

**Files (3):**
1. `src/app/api/admin/transactions/[id]/receipt/route.ts` — GET receipt data as JSON
2. `src/app/api/admin/transactions/[id]/send-receipt/route.ts` — POST re-send receipt email
3. `src/app/api/admin/transactions/[id]/send-receipt/route.test.ts` — Tests

**GET /api/admin/transactions/[id]/receipt:**
- Returns `{ transaction, receiptData }` for the receipt page to render
- If no `receiptData` on the transaction, returns 404

**POST /api/admin/transactions/[id]/send-receipt:**
- Fetches transaction
- If `receiptData` exists, renders it via `@react-email/render` and sends via `sendViaSmtp()`
- Returns `{ success: boolean }`

**Test cases:**
```
it("GET receipt returns 401 without admin auth")
it("GET receipt returns transaction with receiptData")
it("GET receipt returns 404 when receiptData is null")
it("POST send-receipt sends email when receiptData exists")
it("POST send-receipt returns 404 when no receiptData")
it("POST send-receipt returns success even if SMTP fails (graceful)")
```

**Done when:** Tests pass, static checks green.

---

### Sub-task 8: Webhook Integration — Create Transaction on Stripe Payment

**Files (2):**
1. `src/app/api/webhooks/stripe/route.ts` — Add `createOrderTransaction()` + `createTournamentTransaction()` calls
2. `src/app/api/webhooks/stripe/route.test.ts` — Tests (if not existing, create)

**Changes to webhook (after existing PAID logic):**

For product orders (after line 80, after the `$transaction`):
```typescript
// Create unified Transaction record (ADR-003 Decision 8)
await createOrderTransaction(order.id);
```

For tournament registrations (after line 48, after paymentStatus update):
```typescript
// Create unified Transaction record
await createTournamentTransaction(registration.id);
```

**Important:** Call AFTER the existing `$transaction` succeeds, not inside it. If transaction creation fails, payment is still processed — the transaction can be backfilled later.

**Test cases:**
```
it("creates Transaction when product order payment succeeds")
it("creates Transaction when tournament registration payment succeeds")
it("does not create duplicate Transaction on webhook retry")
it("does not create Transaction for non-payment events")
```

**Done when:** Tests pass, static checks green.

---

### Sub-task 9: Email Service — Add sendTransactionReceipt to email.ts

**Files (2):**
1. `src/lib/email.ts` — Add `sendTransactionReceipt()` function
2. `src/lib/email.test.ts` — Test (or add to existing test structure)

**Function:**
```typescript
export async function sendTransactionReceipt(input: {
  to: string;
  receiptData: ReceiptData;
}): Promise<boolean> {
  // Uses ReceiptEmail template from src/emails/receipt.tsx
  // Renders via @react-email/render
  // Sends via sendViaSmtp()
}
```

**Done when:** Tests pass (mock SMTP), static checks green.

---

### ═════════════════════════════════════════════════════
### ⚡ CONTEXT REFRESH #3 — Before starting Sub-task 10
### Re-read ADR-003. Summarize progress:
### - All API endpoints done, webhook integrated, email service done
### - Remaining: backfill script, admin dashboard UI, receipt print page, E2E, deliverables
### ═════════════════════════════════════════════════════

---

### Sub-task 10: Backfill Script — Migrate Existing Orders + TournamentRegistrations

**Files (2):**
1. `scripts/backfill-transactions.ts` — Backfill script
2. `scripts/backfill-transactions.sql` — Optional SQL-only alternative

**Behavior:**
- Iterates all existing Orders where status is PAID, SHIPPED, or COMPLETED
- Calls `createOrderTransaction(order.id)` for each
- Iterates all TournamentRegistrations where paymentStatus is "PAID"
- Calls `createTournamentTransaction(registration.id)` for each
- Idempotent — safe to run multiple times (sub-task 2's idempotency guard)

**Run via:** `npx tsx scripts/backfill-transactions.ts`

**Done when:** Script runs without errors, `SELECT COUNT(*) FROM "Transaction"` matches expected count.

---

### Sub-task 11: UI — Admin Dashboard Page (Unified Transaction View)

**Files (2):**
1. `src/app/admin/(panel)/transactions/page.tsx` — Main dashboard
2. (reuses API from sub-tasks 4-6)

**Features (from ADR-003 + user spec):**

| Feature | Implementation |
|---------|---------------|
| Table columns | Date, ID (truncated), Customer (name or email), Description, Amount, Status, Buyer Type, Actions |
| Search bar | Text input → debounced fetch with `search` param |
| Status filter | Dropdown: All / Pending / Paid / Shipped / Completed / Cancelled / Failed / Not Required |
| Type filter | Dropdown: All / Orders / Tournaments |
| Buyer type filter | Dropdown: All / Users / Guests |
| Sort | Click column headers (date, amount) |
| Pagination | "Load more" or page numbers |
| Status dropdown | Inline edit per row (constrained by type — ADR-003 Decision 9) |
| Remark editor | Inline edit or modal |
| View Receipt button | Links to `/admin/transactions/[id]/receipt` |
| Send Receipt button | Calls POST `/api/admin/transactions/[id]/send-receipt` |
| WhatsApp forward | Reuse existing `buildWhatsAppLink()` from `email.ts` |

**Status options per type (ADR-003 Decision 9):**
- ORDER: PENDING, PAID, SHIPPED, COMPLETED, CANCELLED, FAILED, NOT_REQUIRED
- TOURNAMENT: PENDING, PAID, CANCELLED, FAILED, NOT_REQUIRED (no SHIPPED/COMPLETED)

**Done when:** Page renders, filters work, status/remark edits persist. Manual smoke test passes.

---

### Sub-task 12: UI — Receipt Print Page

**Files (2):**
1. `src/app/admin/(panel)/transactions/[id]/receipt/page.tsx` — Printable receipt
2. (reuses ReceiptEmail component from `src/emails/receipt.tsx`)

**Behavior:**
- Server component — fetches transaction + receiptData
- Renders receipt in a clean, print-friendly layout
- Print button with `window.print()` (or instructions: "Press Cmd+P to print")
- Back button to return to dashboard

**Done when:** Page renders for both ORDER and TOURNAMENT receipt types. Manual print test (Cmd+P) produces clean output.

---

### Sub-task 13: Admin Sidebar — Update Navigation

**Files (1):**
1. `src/components/admin/admin-sidebar.tsx` — Replace or add nav item

**Change:** Replace the existing "交易紀錄" link (currently `/admin/orders`) with the new unified dashboard at `/admin/transactions`. Or add a new item and keep both.

**Decision needed from user:** Replace `/admin/orders` or keep both? (Recommend: replace — the new dashboard includes all order data.)

**Done when:** Sidebar links to the new dashboard.

---

### Sub-task 14: E2E Smoke Test (Playwright)

**Files (2):**
1. `e2e/transactions.spec.ts` — E2E test
2. `playwright.config.ts` — (if config changes needed)

**Test flow:**

```
1. Admin logs in
2. Navigate to /admin/transactions
3. Dashboard loads with transaction list
4. Search by email → results filter
5. Filter by status → results filter
6. Click "View Receipt" on first transaction → receipt page loads
7. Change status on a transaction → status persists after reload
8. Add remark → remark persists after reload
```

**All API calls mocked** (no real database needed for E2E).

**Done when:** `npx playwright test e2e/transactions.spec.ts` passes.

---

### Sub-task 15: Deliverables — PROGRESS.md + PR Description

**Files (2):**
1. `PROGRESS.md` — Context-refresh summary comparing final code against ADR-003
2. (PR description is output to terminal, not a file)

**PROGRESS.md contents:**
- Checklist of all 13 ADR-003 decisions — implemented as specified?
- Any deviations (with reason and user approval)
- Test results summary
- Migration instructions
- Manual smoke test steps

**PR Description template:**
```markdown
## Transaction Management System (ADR-003)

### Files Changed
[List every file with one-line description]

### Tests Added
[List test files + count]

### Test Results
- Unit (Vitest): X/X passing
- E2E (Playwright): X/X passing
- Type check: ✅
- Lint: ✅

### Migration Required
- Run `scripts/backfill-transactions.ts` after deploying
- Run migration SQL on production DB

### Technical Debt
- [Any shortcuts or deferred items]

### Manual Test Steps
[See PROGRESS.md]
```

**Done when:** PROGRESS.md written, PR description output to terminal.

---

## Dependency Graph

```
Sub-task 0 (Schema)
    ↓
Sub-task 1 (Types)
    ↓
Sub-task 2 (Domain Service) ←── TDD tests written first
    ↓
Sub-task 3 (Receipt Template)
    ↓
─── CONTEXT REFRESH #1 ───
    ↓
Sub-task 4 (GET API)
    ↓
Sub-task 5 (PATCH API)
    ↓
Sub-task 6 (POST API)
    ↓
─── CONTEXT REFRESH #2 ───
    ↓
Sub-task 7 (Receipt/Send API)
    ↓
Sub-task 8 (Webhook Integration)
    ↓
Sub-task 9 (Email Service)
    ↓
─── CONTEXT REFRESH #3 ───
    ↓
Sub-task 10 (Backfill Script)
    ↓
Sub-task 11 (Admin Dashboard UI)
    ↓
Sub-task 12 (Receipt Print Page)
    ↓
Sub-task 13 (Sidebar Update)
    ↓
Sub-task 14 (E2E Test)
    ↓
Sub-task 15 (Deliverables)
```

---

## Migration & Deployment Checklist

- [ ] Run `migration.sql` on production DB (via Supabase SQL Editor or pg.Pool)
- [ ] Run `npx prisma generate` on Vercel (automatic on build)
- [ ] Run `scripts/backfill-transactions.ts` after first deploy
- [ ] Verify `SELECT COUNT(*) FROM "Transaction"` matches expected count
- [ ] Test Stripe webhook creates Transaction rows (process a test payment)
- [ ] Test admin dashboard loads and displays transactions
- [ ] Test receipt page renders for both ORDER and TOURNAMENT types
- [ ] Test send-receipt email arrives
- [ ] Keep `rollback.sql` ready in case of emergency

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backfill creates duplicate transactions | Low | Medium | Idempotency guard in domain service (sub-task 2) |
| Webhook Transaction creation fails silently | Medium | Low | Payment still succeeds; Transaction can be backfilled |
| `receiptData` JSON format changes | Low | Medium | Old snapshots stay in old format — acceptable (point-in-time) |
| Admin sets tournament to SHIPPED via API | Low | Low | Presentation layer restricts; DB allows it (ADR-003 Decision 9) |
| Float precision in `amount` | Low | Low | Using Float (matches existing Order.totalAmount) |
| Migration fails on Vercel DB | Medium | High | Test migration on local first; rollback.sql ready |
