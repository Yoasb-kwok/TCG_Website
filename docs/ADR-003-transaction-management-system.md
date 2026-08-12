# ADR-003: Transaction Management System with Unified Receipt

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-12 |
| **Decision Maker** | Lucas (developer), with grilling session |
| **Supersedes** | None |
| **Related** | ADR-002 (Email OTP), existing Order/OrderItem schema |

---

## Context

The shop has two types of financial transactions — **product orders** and **tournament registrations** — each with separate tables, separate status models, and no unified admin view. The admin currently manages orders on a basic status-dropdown page with no search, no receipt generation, no remark field, and no tournament financial visibility.

We need a **unified transaction management dashboard** that:
- Shows all financial transactions (products + tournaments) in one place
- Generates printable/emailable receipts
- Lets admin edit status and add remarks
- Supports search, filter, and sort

This ADR was produced via a grilling session covering 12 decisions.

---

## 3-Layer Separation

This feature follows a 3-layer architecture:

```
Presentation Layer  →  Admin Dashboard, Receipt Print Page, Edit Controls
        ↓
Domain Layer        →  Transaction Service, Receipt Snapshot Builder, Email Renderer
        ↓
Data Layer          →  Order, TournamentRegistration (operational) + Transaction (financial ledger)
```

| Layer | Responsibility | Components |
|-------|---------------|------------|
| **Presentation** | UI rendering, user interaction | Dashboard page, receipt print page, search/filter/sort UI, status/remark editors, send-receipt button |
| **Domain** | Business logic — when/how transactions are created, receipt generation, email delivery | Transaction creation service (webhook + manual), receipt snapshot builder, receipt email renderer, status transition rules |
| **Data** | Persistence | `Transaction` table (unified ledger), `Order` + `OrderItem` (operational), `TournamentRegistration` (operational), `receiptData` JSON snapshot |

---

## Decision 1: Status Model — Extend Existing Enum

**Decision:** Add `FAILED` and `NOT_REQUIRED` to the existing `OrderStatus` enum.

```
PENDING, PAID, SHIPPED, COMPLETED, CANCELLED, FAILED, NOT_REQUIRED
```

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Extend enum (chosen)** | No data migration; keeps fulfilment tracking; minimal risk | 7 statuses — slightly more complex UI | ✅ Chosen |
| B. Replace with 4-status set | Simpler mental model | Loses SHIPPED/COMPLETED/CANCELLED; breaking migration | ❌ |
| C. Merge all possible statuses | Most flexible | 8 statuses; complex state machine | ❌ |

### Context
The shop uses SHIPPED and COMPLETED for product fulfilment tracking. CANCELLED is needed for refunds. `FAILED` covers failed Stripe payments. `NOT_REQUIRED` covers offline/manual transactions.

### Consequences
- **Positive:** Existing orders keep working; admin retains fulfilment tracking.
- **Negative:** 7 statuses is slightly busy in the dropdown.
- **Migration:** Add `FAILED` and `NOT_REQUIRED` to the PostgreSQL enum. No data backfill needed.

---

## Decision 2: Receipt Storage — JSON Snapshot at Payment Time

**Decision:** Store a `receiptData` JSON snapshot on the `Transaction` table when payment succeeds. Receipts render from this frozen snapshot, not live data.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. Generate on-demand (no storage) | Simplest; zero storage | Receipt reflects current data — mutable after purchase | ❌ |
| **B. JSON snapshot (chosen)** | Immutable proof of purchase; accurate if prices change later | Redundant with OrderItem data; slightly more complex | ✅ Chosen |
| C. Store actual PDF blob | True document of record | PDF blobs bloat DB (50-200KB each); complex generation pipeline | ❌ |

### Context
Product prices and tournament entry fees may change over time. The receipt must reflect what was paid at the time of purchase, not current prices.

### Consequences
- **Positive:** Receipts are immutable and accurate to the moment of purchase.
- **Negative:** `receiptData` duplicates some OrderItem data.
- **Review trigger:** If receipt format changes significantly, old snapshots won't auto-update. Acceptable — receipts should be point-in-time.

---

## Decision 3: Receipt Rendering — One Shared React Email Template

**Decision:** Use one React Email component, rendered via `@react-email/render`, for both the printable receipt page and the email receipt. No PDF generation library.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. React page + separate email template | Simple | Two templates to maintain | ❌ |
| **C. Shared template (chosen)** | Single source of truth; uses existing pipeline; no new deps | `cmd+p` print quality depends on browser | ✅ Chosen |
| B. Server-side PDF (puppeteer/react-pdf) | True PDF file | Heavy deps; puppeteer doesn't work well on Vercel serverless | ❌ |

### Context
The project already uses `@react-email/render` + Nodemailer (Gmail SMTP) for OTP emails. The same pipeline works for receipts.

### Consequences
- **Positive:** Zero new dependencies; consistent look between page and email.
- **Negative:** No downloadable `.pdf` file — admin uses browser print dialog (`cmd+p`).
- **Review trigger:** If the client requires actual PDF attachments in emails, revisit and add `@react-pdf/renderer`.

---

## Decision 4: Payment Method — Removed

**Decision:** No `paymentMethod` field. Removed from the dashboard entirely.

### Context
The shop primarily uses Stripe. Tracking cash/FPS/PayMe as a separate field adds complexity without clear value at this stage.

### Consequences
- **Positive:** Simpler schema and UI.
- **Negative:** Cannot filter or report by payment method.
- **Review trigger:** If accounting requires payment method breakdown, add a string field to `Transaction`.

---

## Decision 5: Status Transitions — Unconstrained

**Decision:** Admin can change any transaction status to any other status. No state machine, no transition rules, no audit logging.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Unconstrained (chosen)** | Maximum flexibility; simplest implementation | No guardrails; no audit trail | ✅ Chosen |
| B. Unconstrained + audit log | Full visibility into status changes | More complex — need history table | ❌ |
| C. Soft constraints (blocked transitions) | Prevents obvious mistakes | Must maintain transition table | ❌ |

### Context
Small shop with 1-2 admins. Mistakes are easily corrected by changing the status back.

### Consequences
- **Positive:** Dead-simple implementation — one PATCH endpoint.
- **Negative:** No record of who changed what or when.
- **Review trigger:** If disputes arise about status changes, add a simple `statusHistory` JSON array to Transaction.

---

## Decision 6: Scope — Unified Dashboard (Products + Tournaments)

**Decision:** The transaction dashboard shows BOTH product orders and tournament registrations in one unified view.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. Product orders only | Simpler — one data source | No unified financial view | ❌ |
| **B. Unified dashboard (chosen)** | Single source of truth for all money | Complex — must unify two data models | ✅ Chosen |
| C. Products now, tournaments later | Pragmatic, phased delivery | Fragmented view; might never add tournaments | ❌ |

### Context
The supervisor needs to see total revenue across products and tournaments in one place.

### Consequences
- **Positive:** Complete financial visibility.
- **Negative:** More complex data model (requires Decision 7).
- **Review trigger:** If tournament transactions have very different admin needs, consider splitting into tabs.

---

## Decision 7: Data Model — New `Transaction` Table

**Decision:** Create a new `Transaction` table that serves as the unified financial ledger. Both Stripe webhook (online) and admin (offline) write to it.

```prisma
model Transaction {
  id           String           @id @default(uuid())
  type         TransactionType  // ORDER | TOURNAMENT
  referenceId  String           // Order.id or TournamentRegistration.id
  buyerType    BuyerType        // USER | GUEST
  email        String
  customerName String?          // null for guests (display email instead)
  description  String           // product names or tournament title
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
}

enum TransactionType {
  ORDER
  TOURNAMENT
}

enum BuyerType {
  USER
  GUEST
}
```

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. UNION query at DB level | Single query; no new table | Complex SQL; Prisma doesn't support UNION; no receiptData/remark | ❌ |
| **B. New Transaction table (chosen)** | Clean domain model; one table for all financial data; easy to query | Migration needed; dual-write (Order + Transaction) | ✅ Chosen |
| C. Application-level merge | No migration; works with existing tables | Two queries; no DB-level fields for remark/receiptData; harder to search | ❌ |

### Context
The `Transaction` table is the domain layer's single source of truth for "money that moved through the shop." `Order` and `TournamentRegistration` remain as operational data sources.

### Consequences
- **Positive:** Clean unified model; admin dashboard queries one table; easy to add remark/receiptData.
- **Negative:** Every payment creates two records (source + Transaction); backfill needed for existing data.
- **Review trigger:** If data drift between Order and Transaction becomes a problem, add a periodic reconciliation job.

---

## Decision 8: Creation Timing — Webhook + Manual

**Decision:** Online payments create a `Transaction` row in the Stripe webhook (`checkout.session.completed`). Offline payments are created manually by admin.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. At checkout initiation | Full funnel visibility | Cluttered with abandoned carts | ❌ |
| B. At payment success only | Clean — only real money | Offline payments invisible | ❌ |
| **C. Webhook + manual (chosen)** | Captures all real transactions (online + offline) | Two creation paths; admin UI for manual entry | ✅ Chosen |

### Context
The shop has walk-in customers who pay cash or FPS. The `NOT_REQUIRED` status is for these offline transactions.

### Consequences
- **Positive:** Complete financial ledger.
- **Negative:** Admin UI needed for manual transaction creation.
- **Review trigger:** If manual entry is error-prone, add validation or templates.

---

## Decision 9: Transaction Status — Reuse OrderStatus, Restrict Tournament

**Decision:** `Transaction.status` uses the `OrderStatus` enum. The presentation layer restricts which statuses appear based on `type`:
- **ORDER:** all 7 statuses available
- **TOURNAMENT:** PENDING, PAID, CANCELLED, FAILED, NOT_REQUIRED only (no SHIPPED/COMPLETED)

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. Reuse full enum (no restriction) | Simplest | SHIPPED/COMPLETED nonsensical for tournaments | ❌ |
| **A + restriction (chosen)** | One enum; UI handles type-specific options | Presentation layer must know the restriction | ✅ Chosen |
| B. Payment-focused enum only | Every status valid for both types | Loses fulfilment tracking for orders | ❌ |
| C. Split payment + fulfilment | Most accurate model | Over-engineered; two dropdowns | ❌ |

### Context
SHIPPED and COMPLETED are fulfilment concepts — they don't apply to tournament registrations. But orders need them.

### Consequences
- **Positive:** One enum to maintain; tournament dropdown is clean.
- **Negative:** Restriction is in presentation layer, not enforced by DB.
- **Review trigger:** If admin sets a tournament to SHIPPED via API (bypassing UI), the DB allows it. Acceptable risk.

---

## Decision 10: Source Link — Polymorphic Reference

**Decision:** `Transaction` has `type` (ORDER | TOURNAMENT) and `referenceId` (string pointing to Order.id or TournamentRegistration.id). No foreign key constraint.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Polymorphic reference (chosen)** | Standard ledger pattern; flexible | No FK constraint; manual resolution | ✅ Chosen |
| B. Two nullable FKs | FK enforced; Prisma relations | Two nullable columns; harder to extend | ❌ |
| C. No link (self-contained) | Simplest; no orphaned refs | Can't navigate to original order | ❌ |

### Context
The `receiptData` snapshot makes Transaction self-sufficient for receipts. The reference link is for admin navigation (deep-link to original order/registration).

### Consequences
- **Positive:** Flexible; standard pattern; easy to add new transaction types.
- **Negative:** No DB-level integrity check. If an Order is deleted, the Transaction's `referenceId` becomes stale.
- **Review trigger:** If orphaned references become a problem, add a cleanup job or soft-delete Orders instead of hard-delete.

---

## Decision 11: Receipt Snapshot Format — Discriminated Union

**Decision:** `receiptData` is a JSON discriminated union. The receipt template branches on `receiptData.type` to render the appropriate layout.

```typescript
// ORDER receipt:
type OrderReceiptData = {
  type: "ORDER";
  orderId: string;
  email: string;
  items: { name: string; condition: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  date: string;
};

// TOURNAMENT receipt:
type TournamentReceiptData = {
  type: "TOURNAMENT";
  tournamentTitle: string;
  playerName: string;
  entryFee: number;
  startsAt: string;   // tournament date/time
  location: string;
  date: string;       // registration/purchase date
};
```

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Discriminated union (chosen)** | Rich, type-specific receipts; clear data shape | Template has conditionals | ✅ Chosen |
| B. Flat normalized (title, lines[], total) | One template, no conditionals | Loses type-specific detail (condition, location, etc.) | ❌ |

### Context
Tournament receipts need date/time and location (same format as order receipts but with tournament-specific details). Product receipts need item names, conditions, quantities.

### Consequences
- **Positive:** Each receipt type shows relevant details.
- **Negative:** Receipt template has two branches.
- **Review trigger:** If a third transaction type is added, add a new discriminator branch.

---

## Decision 12: Buyer Type Tag — `BuyerType` Enum

**Decision:** Add a `BuyerType` enum (`USER | GUEST`) to `Transaction`. Set at creation time based on whether the source record has a `userId`.

```prisma
enum BuyerType {
  USER
  GUEST
}
// Transaction.buyerType: BuyerType
```

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. BuyerType enum (chosen)** | Explicit; self-sufficient; simple filter | Guest's old transactions stay GUEST even if they later register | ✅ Chosen |
| B. Store userId (nullable) | No new enum; can join to User | Polymorphic userId; less explicit | ❌ |
| C. Derive at query time | Always current; no field | Complex joins; breaks self-sufficiency | ❌ |

### Context
Guests purchase without an account — they just provide an email. The dashboard needs to distinguish user vs guest transactions for filtering and display.

### Consequences
- **Positive:** Simple `WHERE buyerType = 'GUEST'` filter; Transaction stays self-sufficient.
- **Negative:** If a guest later creates an account, their old transactions remain tagged GUEST.
- **Review trigger:** If linking guest history to new accounts becomes important, add a one-time backfill job.

---

## Decision 13: Display Name — `customerName` Field

**Decision:** Add a `customerName` field (nullable) to `Transaction`. Populated at creation time based on buyer type and transaction type. For guests, it's null — the dashboard displays their email instead.

```typescript
// Display logic (presentation layer):
const displayName = transaction.customerName ?? transaction.email;
```

### Population Logic

| Transaction type | Buyer type | `customerName` value |
|-----------------|-----------|---------------------|
| ORDER | USER | `User.name` |
| ORDER | GUEST | `null` (display email) |
| TOURNAMENT | USER | `TournamentRegistration.playerName` |
| TOURNAMENT | GUEST | `TournamentRegistration.playerName` |

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Store customerName at creation (chosen)** | Self-sufficient; frozen at transaction time | Doesn't update if user changes name later | ✅ Chosen |
| B. Join to User table at query time | Always current name | Complex joins through polymorphic reference | ❌ |
| C. Repurpose playerName field | No new field | Overloaded — different meaning per type | ❌ |

### Context
Tournament registrations always have `playerName` (required on the form). Product orders have no name field for guests. The `customerName` field unifies these into one display field.

### Consequences
- **Positive:** One display field for all transaction types; no joins needed.
- **Negative:** If a user changes their account name, old transactions show the old name (acceptable for a ledger).
- **Review trigger:** None — frozen names are correct for a financial record.

---

## Consequence Summary

### Schema Changes Required

| Change | Type | Risk |
|--------|------|------|
| Add `FAILED`, `NOT_REQUIRED` to `OrderStatus` enum | ALTER TYPE | Low |
| Create `Transaction` table | CREATE TABLE | Low |
| Create `TransactionType` enum | CREATE TYPE | Low |
| Create `BuyerType` enum | CREATE TYPE | Low |
| Backfill existing Orders → Transactions | Data migration | Medium |
| Backfill existing TournamentRegistrations → Transactions | Data migration | Medium |
| Add `receiptData` snapshot to webhook flow | Code change | Low |

### New API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/transactions` | List transactions with search, filter (status, buyerType), sort |
| `PATCH /api/admin/transactions/[id]` | Update status / remark |
| `POST /api/admin/transactions` | Create manual offline transaction |
| `GET /api/admin/transactions/[id]/receipt` | Render printable receipt page |
| `POST /api/admin/transactions/[id]/send-receipt` | Re-send receipt email |

### New UI Pages

| Page | Purpose |
|------|---------|
| `/admin/transactions` | Unified dashboard (replaces or augments existing `/admin/orders`) |
| `/admin/transactions/[id]/receipt` | Printable receipt page (`cmd+p` → PDF) |

### Email

| Template | Purpose |
|----------|---------|
| `src/emails/receipt.tsx` | Shared receipt template (discriminated union: ORDER / TOURNAMENT) |

---

## Review Triggers

| When | What to revisit |
|------|----------------|
| Disputes about status changes | Add `statusHistory` JSON to Transaction (Decision 5) |
| Client requires PDF file attachments | Add `@react-pdf/renderer` (Decision 3) |
| Data drift between Order and Transaction | Add reconciliation job (Decision 7) |
| Need payment method tracking | Add `paymentMethod` string field (Decision 4) |
| Orphaned referenceIds | Switch to soft-delete or add cleanup job (Decision 10) |
| Third transaction type needed | Add discriminator branch in receipt template (Decision 11) |
| Guest history should link to new accounts | Add backfill job to relink buyerType + customerName (Decision 12) |

---

## 3-Layer Separation: Assessment

| Layer | What lives here | Assessment |
|-------|----------------|------------|
| **Presentation** | Dashboard UI, receipt print page, search/filter/sort controls, status/remark editors, send-receipt button | ✅ Clean — pure UI, no business logic |
| **Domain** | Transaction creation (webhook + manual), receipt snapshot builder, receipt email renderer, status restriction rules (tournament excludes SHIPPED/COMPLETED) | ✅ Clean — business rules live here, not in UI or DB |
| **Data** | `Transaction` table (financial ledger), `Order` + `TournamentRegistration` (operational data), `receiptData` JSON snapshot | ✅ Clean — financial data separated from operational data |

**Key learning for the architect:** The biggest architectural insight from this session is that financial data (`Transaction`) and operational data (`Order`, `TournamentRegistration`) are different concerns. The `Transaction` table is a **projection** of operational events into a financial ledger — a common pattern in real-world systems (event sourcing / CQRS lite).
