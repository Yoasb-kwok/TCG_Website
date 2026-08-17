# ADR-001: Notification System, Global Header Filter, and CSV Import/Export

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-10 |
| **Decision Maker** | Project owner (via grilling session) |
| **Supersedes** | — |

---

## Context

Three changes were proposed for this development cycle:

1. **Notification system** — Send order invoices to customers and notify tournament registrants when an admin cancels a tournament.
2. **Global header filter** — Move product filtering from a products-page-only sidebar into the global site header, accessible from every page.
3. **CSV import/export** — Export all database tables for backup, and import products in bulk via CSV.

The project owner is a beginner in software architecture and requested an evaluation of their architectural thinking alongside the decisions.

### Current State of the Codebase

- **No notification infrastructure exists** — zero email/WhatsApp libraries, no `sendEmail` or `notify` calls anywhere.
- **Auth is Credentials-only** (email + password + bcrypt via NextAuth v5). No magic links, no email verification, no OAuth.
- **Order flow**: Checkout → Stripe → Webhook sets `PENDING → PAID` + decrements stock. No notification sent.
- **`Order` model** has no phone number or shipping address — only `email`.
- **Filter state** lives in `MarketplaceShell` local `useState`, partially duplicated between URL params (search, type, cardSet, language) and local state (types[], setCodes[], rarityTiers[], etc.).
- **No CSV import/export** exists. 12 tables with foreign key dependencies.
- **`shipping/page.tsx`** promises customers email/WhatsApp notifications that are not yet implemented.

---

## Decision 1: Notification System

### Summary

| Trigger | Recipient | Channel | Delivery | Cost |
|---------|-----------|---------|----------|------|
| Product order paid | Customer | Email | Resend — automatic, fires in Stripe webhook | Free (3,000/mo) |
| Product order paid | Admin (shop) | WhatsApp | wa.me deep link on admin dashboard — manual click | Free |
| Tournament cancelled by admin | All registrants | Email | Resend — automatic, fires when status → `CANCELLED` | Free |

### Rationale

**Email service: Resend**
- First-class React Email template support — invoice templates are React components.
- 3-line integration: `import { Resend } from 'resend'`.
- 3,000 emails/month free tier — far exceeds expected volume for a small TCG shop.
- Vercel-native — works in serverless functions with no connection pooling issues.

**Admin WhatsApp: wa.me deep link (manual)**
- Free — no Meta Business account, no API keys, no per-conversation charges.
- The admin dashboard shows a "Forward to WhatsApp" button per order that opens WhatsApp with a pre-filled message containing order details.
- Upgrade path to WhatsApp Cloud API is clean: swap the wa.me button for an API call in the same webhook handler, when order volume justifies the cost.

**Tournament cancellation: Email only (no WhatsApp)**
- Speed matters when cancelling — all registrants must know immediately.
- Email via Resend sends to all registrants in one API call, instantly, for free.
- Manual wa.me links for 32 players would be slow and error-prone during a time-sensitive cancellation.

**Refunds: None**
- Entry fees are non-refundable. The cancellation email states the tournament is cancelled without offering a refund.

### Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| **Magic.link / magic-link auth** | Conceptual confusion — magic links solve authentication (passwordless login), not notifications (sending messages). The project needed notifications, not a new auth method. |
| **WhatsApp Cloud API (automatic)** | Costs ~HKD 0.3–0.8 per business-initiated conversation. Justified later when volume grows, but premature now. |
| **Twilio / Wati / 360dialog (BSP)** | Adds a middleman fee for convenience. Direct Meta Cloud API is simpler when the time comes. |
| **SendGrid** | Heavier SDK, proprietary template system. Resend's React Email integration is a better fit for this Next.js + React stack. |
| **AWS SES** | Cheapest at scale but requires AWS IAM, region config, and significant setup. Overkill for current volume. |
| **Nodemailer + Gmail SMTP** | Hacky — storing Gmail app passwords, not production-grade, Gmail sending limits. |
| **Automatic Stripe refunds on tournament cancel** | Removes admin control. Edge cases (partial refunds, failed refunds) add complexity. Manual refund via Stripe Dashboard is safer for a small shop. |
| **WhatsApp for tournament cancellation** | Manual wa.me links for all registrants is impractical. Cloud API costs money. Email covers the need for free. |

### New Dependencies

- `resend` — email sending API client
- `react-email` — React-based email template components

### New Environment Variables

- `RESEND_API_KEY` — Resend API key
- `SHOP_WHATSAPP_NUMBER` — Shop's WhatsApp number for wa.me links

### Schema Changes

None. `Order` already has `email`. `TournamentRegistration` already has `email`.

### Implementation Points

- **Product order email receipt**: fires inside `src/app/api/webhooks/stripe/route.ts`, after `Order.status` is set to `PAID`.
- **Admin wa.me link**: rendered on `src/app/admin/(panel)/orders/page.tsx`, one button per order.
- **Tournament cancellation email**: fires inside `PATCH /api/admin/tournaments/[id]` handler, after status is set to `CANCELLED`. Queries all `TournamentRegistration` rows for the tournament and sends a Resend email to each.

---

## Decision 2: Global Header Filter with URL as Single Source of Truth

### Summary

Move all product filter state into URL search params. The global site header contains a filter dropdown (accessible from every page) that reads and writes these URL params. The existing `/products` sidebar filter panel also reads from the same URL params. Both UIs are always in sync because they share one source of truth.

### Rationale

**URL as single source of truth** is the correct architectural pattern for e-commerce filtering:

- The header and `/products` page read the same source — no sync issues, ever.
- Users can bookmark or share a filtered product link.
- Browser back/forward works naturally.
- It's how every major e-commerce site works (Amazon, Shopee, etc.).

The existing filter state is split between two sources:
- URL params: `search`, `type` (single), `cardSet` (single), `language`
- Local state (inside `MarketplaceShell`): `types[]`, `setCodes[]`, `rarityTiers[]`, `cardSets[]`, `pokemonTypes[]`, `priceRange`, `inStock`, `sort`

This split means the header cannot see sidebar selections, and filters are not shareable.

### Alternatives Considered

| Alternative | Why rejected |
|---------------|--------------|
| **Global filter context (React Context)** | New global state, sync issues with browser back button, non-shareable filters. Adds complexity without the benefits of URL-as-state. |
| **Header navigates, doesn't sync (desync approach)** | If user changes filters in sidebar after arriving from header, the header dropdown won't reflect those changes. Desync confuses users and generates bug reports. |
| **Products page only (not global header)** | Rejected by project owner. Desired the filter to be accessible from every page, not just `/products`. |

### Refactor Required

`MarketplaceShell` (`src/components/marketplace/marketplace-shell.tsx`) switches from:

```typescript
const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
```

To reading/writing `useSearchParams()` for all filter dimensions. The `FilterPanel` component itself does not change — it receives values from URL params instead of local state props.

The header filter UI is a new component that:
1. Shows filter options (reusing `FilterPanel` or a compact variant).
2. On apply, navigates to `/products` with filter params encoded in the URL.
3. When already on `/products`, updates URL params (which `MarketplaceShell` reads via `useSearchParams`).

### Available Filter Dimensions (11 total)

| Dimension | URL param(s) | Type |
|-----------|-------------|------|
| Sort | `sort` | Enum: `newest`, `setCode`, `rarityTier`, `priceAsc`, `priceDesc` |
| In-stock only | `inStock` | Boolean |
| Price range | `minPrice`, `maxPrice` | Number pair (0–5000 HKD) |
| Product type | `type` (repeated) | Enum: `SINGLE`, `BOOSTER_PACK`, `GIFT_BOX`, etc. |
| Set code (系列編號) | `setCode` (repeated) | String (M1L, M3, M2A, SV3...) |
| Rarity tier (稀有度分類) | `rarityTier` (repeated) | String (MUR, SAR, SR, AR, RR, R...) |
| Card set name (系列名稱) | `cardSet` (repeated) | String (dynamic from products) |
| Pokémon attribute (屬性) | `pokemonType` (repeated) | String (dynamic from products) |
| Search term | `search` | String (matches name/description/set/rarity) |
| Language | `language` | String (default `zh-HK`) |

### Schema Changes

None.

---

## Decision 3: CSV Import/Export

### Summary

| Feature | Scope |
|---------|-------|
| Export | All tables except `Image` → CSV files for backup |
| Import | Products only — one CSV row creates one `Product` + one `ProductVariant` |
| Existing products | Skip (create-only, match by `slug`) |
| Bad rows | Partial success — valid rows created, errors reported per row |

### Rationale

**Full export, product-only import:**
- Export-all is cheap to build and useful for backups.
- Products are the only table where bulk import saves real time (e.g., adding 50+ cards from a new set in one upload).
- Other tables (Users, Orders, Tournaments, Taxonomy) already have seed scripts and admin UI.

**One row per product:**
- For a TCG shop, the most common bulk import is adding a new card set — many single cards, each with one dominant variant (e.g., Near Mint at one price).
- Multi-variant products (same card in multiple conditions) are managed individually through the admin UI after creation.
- CSV is dead simple: `name, type, setCode, rarityTier, cardNumber, condition, isFoil, price, stock`.

**Create-only (no upsert):**
- Use case is adding NEW products, not updating existing ones.
- Re-uploading the same CSV safely skips duplicates instead of overwriting hand-edited prices/stock.
- Bulk price updates are a separate feature if needed later.

**Partial success with error report:**
- An admin uploading 50 cards shouldn't have to fix one typo and re-upload everything.
- Matches the existing batch tournament creation pattern (creates valid ones, reports errors for the rest).

### Alternatives Considered

| Alternative | Why rejected |
|---------------|--------------|
| **Full 12-table CSV restore** | Massive complexity — ID remapping, FK resolution, conflict handling — for little benefit. Seed scripts handle non-product tables. |
| **One row per variant (multi-variant in one upload)** | More complex parsing. Admin must repeat product info across rows. Most uploads are single-variant cards. |
| **Two CSV files (products + variants)** | Admin uploads two files — more friction. |
| **Upsert (create + update)** | Risky — a stale CSV could overwrite hand-edited prices/stock. Create-only is safer. |
| **All-or-nothing (transaction) on import** | One bad row blocks 49 good ones. Impractical for catalog imports. |

### Foreign Key Dependency Map

Import order is irrelevant because only Products (+ their Variants) are imported. For reference, the full dependency chain if full-table import were ever needed:

```
TaxonomyOption (standalone)
User → Order → OrderItem ← ProductVariant ← Product ← Image
Product → HomeFeaturedProduct
HomeBanner (standalone)
AboutPageContent (standalone)
Tournament → TournamentRegistration ← User
```

### CSV Column Specification (Product Import)

```
name, type, setCode, rarityTier, cardNumber, cardSet, rarity,
cardCategory, pokemonType, condition, isFoil, price, stock
```

| Column | Required | Notes |
|--------|----------|-------|
| `name` | ✅ | Product name |
| `type` | ✅ | `SINGLE`, `BOOSTER_PACK`, `GIFT_BOX`, etc. |
| `setCode` | ❌ | Must match a `TaxonomyOption` with `kind=SET_CODE` |
| `rarityTier` | ❌ | Must match a `TaxonomyOption` with `kind=RARITY` |
| `cardNumber` | ❌ | Card number (e.g., `012/063`) |
| `cardSet` | ❌ | Card set display name |
| `rarity` | ❌ | Specific rarity string |
| `cardCategory` | ❌ | Must match `TaxonomyOption` with `kind=CARD_CATEGORY` |
| `pokemonType` | ❌ | Must match `TaxonomyOption` with `kind=POKEMON_ATTRIBUTE` |
| `condition` | ✅ | Variant condition (e.g., `NM`, `Mint`) |
| `isFoil` | ✅ | `true` / `false` |
| `price` | ✅ | HKD amount (Float) |
| `stock` | ✅ | Integer |

Fields not in CSV: `slug` (auto-generated from name), `setSortIndex`/`raritySortIndex` (from taxonomy), `externalCardId`, `language` (default `zh-HK`), `Image` (skipped).

### Export Specification

Each table (except `Image`) exports to a separate CSV file. The admin downloads a ZIP archive containing:

```
export-2026-08-10.zip
├── User.csv
├── Product.csv
├── ProductVariant.csv
├── Order.csv
├── OrderItem.csv
├── Tournament.csv
├── TournamentRegistration.csv
├── TaxonomyOption.csv
├── HomeBanner.csv
├── HomeFeaturedProduct.csv
└── AboutPageContent.csv
```

### Schema Changes

None.

---

## Architecture Evaluation

### What was done right

1. **Cost awareness on WhatsApp** — The project owner correctly flagged that WhatsApp API costs money before committing to it. Questioning recurring costs before building is good architectural instinct.

2. **Pragmatic scope on CSV** — Originally proposed "all tables" but accepted narrowing to product-only import when the complexity of full-table import wasn't justified. Willingness to narrow scope when complexity isn't warranted shows good judgment.

3. **Choosing free tiers first** — wa.me links and Resend free tier. Starting free and upgrading when volume justifies it is the right approach for a small shop.

### Conceptual corrections made during grilling

1. **Magic links ≠ notifications** — The original plan confused authentication (magic links, Magic.link) with notifications (sending invoices). These are completely separate systems:
   - **Auth** answers: "who is this person?" (login, sessions, passwords)
   - **Notifications** answer: "how do we send them a message?" (email, WhatsApp, push)
   
   **Lesson:** Define the problem before choosing a tool. The right approach is: define the problem (send invoices), then find the tool (Resend) — not the reverse.

2. **"No real architectural impact" on the header filter** — This was incorrect. Moving filter state from a local component to a global header changes how state flows through the application. Any time data needs to cross component boundaries (especially across different pages/layouts), there IS architectural impact.
   
   **Lesson:** Ask "can component B see what component A knows?" If no, a state architecture change is required.

3. **"Cancel booking" was ambiguous** — Could have meant customer-initiated or admin-initiated cancellation. These are very different features with different complexity.
   
   **Lesson:** When describing a feature, specify **who acts** and **what triggers** the action. "Admin cancels tournament → system emails registrants" is unambiguous.

### Key architecture lesson: URL is state

The most important concept from this session. Moving filter state from React `useState` to URL search params means:

- The header and products page read the same source — no sync bugs possible.
- Users can bookmark/share filtered views.
- Browser back/forward works naturally.
- It's the standard e-commerce pattern.

This applies beyond filters: pagination, tabs, modal state, sorting — anything the user might want to share or bookmark belongs in the URL.

---

## Consequences

### Positive

- **No recurring costs** — All three changes use free tiers or free approaches.
- **No schema migrations** — All decisions work with the existing database schema.
- **Shareable product filters** — URL-as-state makes filtered views bookmarkable.
- **Bulk product creation** — CSV import eliminates manual one-by-one product entry.
- **Data backups** — Full table export provides a simple backup mechanism.
- **Customer communication** — Email receipts and cancellation notices close the gap between promised and actual functionality.

### Negative / Trade-offs

- **Admin WhatsApp is manual** — Admin must click the wa.me link per order. Acceptable at current volume, but will need WhatsApp Cloud API as orders grow.
- **No refunds for cancelled tournaments** — Business decision. If policy changes, Stripe refund API integration is needed.
- **CSV import is product-only** — Other tables still require manual entry or seed scripts. Full-table restore would need significant additional work.
- **MarketplaceShell refactor** — Moving from local state to URL params requires rewriting the filter state management in the products page. Moderate effort with regression risk.
- **New dependencies** — `resend` and `react-email` added to the project.

### Upgrade Paths

| Current | Future trigger | Upgrade to |
|---------|---------------|------------|
| wa.me manual link | Order volume makes manual clicking tedious | WhatsApp Cloud API (automatic sending) |
| Email-only tournament cancellation | Need WhatsApp delivery guarantees | Add WhatsApp Cloud API alongside email |
| Create-only CSV import | Need bulk price/stock updates | Add upsert mode with slug matching |
| Product-only CSV import | Need full backup/restore | Expand to all 12 tables with FK ordering |
| No tournament refunds | Policy changes to offer refunds | Stripe Refunds API in cancellation handler |

---

## References

- Stripe webhook handler: `src/app/api/webhooks/stripe/route.ts`
- Tournament registration API: `src/app/api/tournaments/register/route.ts`
- Tournament status update API: `src/app/api/admin/tournaments/[id]/route.ts`
- Products filtering: `src/components/marketplace/marketplace-shell.tsx`, `src/components/marketplace/filter-panel.tsx`
- Products API: `src/app/api/products/route.ts`, `src/lib/products.ts`
- Prisma schema: `prisma/schema.prisma`
- Architecture review: `docs/Ptcg review.md`
