# TCG HK — Project Handover SOP

**Purpose:** Standard operating procedure for interns and junior developers taking over continuous development and day-to-day data input for the Pokémon TCG Hong Kong e-commerce site.

**Last updated:** July 2026  
**Stack:** Next.js 16 · TypeScript · PostgreSQL (Prisma) · Stripe · NextAuth v5

---

## 1. Project overview

| Item | Detail |
|------|--------|
| **Repository** | [github.com/Yoasb-kwok/TCG_Website](https://github.com/Yoasb-kwok/TCG_Website) |
| **Product** | Hong Kong Pokémon TCG online store — singles, sealed products, accessories, in-store tournaments |
| **Language / locale** | Traditional Chinese UI, HKD pricing |
| **Public site** | `/` (home), `/products`, `/about`, `/tournaments`, `/checkout` |
| **Admin panel** | `/admin` (requires `ADMIN` role) |
| **Login** | `/login` → redirects to `/admin` for admins |

**Important:** The site can run in **demo mode** without a database (shows sample data). All real data entry and admin work requires a configured `DATABASE_URL`.

---

## 2. Roles and responsibilities

### 2.1 Data input interns (primary audience)

Focus on **admin panel operations** — no code changes required for routine work:

- Maintain taxonomy labels (series, rarity, card numbers, etc.)
- List and update products (singles, sealed, accessories)
- Manage homepage banners, featured products, and About page content
- Update order statuses after fulfilment
- Create tournaments and review registrations

### 2.2 Development interns

Everything above, plus:

- Bug fixes and small features on a feature branch
- Run migrations and seeds in dev/staging only (never on production without approval)
- Follow the Git workflow in Section 8

### 2.3 Lead / supervisor

- Owns production credentials (`.env`, Stripe, database, Vercel)
- Reviews and merges pull requests
- Approves schema changes and deployments
- Resets admin passwords when needed

---

## 3. Access checklist (onboarding)

Before starting work, confirm you have:

- [ ] GitHub repository access to [Yoasb-kwok/TCG_Website](https://github.com/Yoasb-kwok/TCG_Website) (read for data interns; write for dev interns)
- [ ] `.env` file from supervisor (never commit this file)
- [ ] Admin login: email + password (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`)
- [ ] Staging or local environment URL
- [ ] Stripe Dashboard access (only if handling payment issues — ask supervisor)

**First-day setup (developers):**

```bash
git clone https://github.com/Yoasb-kwok/TCG_Website.git
cd TCG_Website
npm install
cp .env.example .env   # then fill in values from supervisor
npm run db:generate
npm run db:migrate
npm run db:seed-taxonomy
npm run db:seed-admin
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) and log in.

---

## 4. Environment variables

| Variable | Purpose | Who sets it |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Supervisor |
| `AUTH_SECRET` | Session encryption (`openssl rand -base64 32`) | Supervisor |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin account via `db:seed-admin` | Supervisor |
| `STRIPE_SECRET_KEY` | Server-side Stripe | Supervisor |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Supervisor |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Supervisor |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (e.g. `https://xxx.vercel.app`) | Supervisor |

**Rules:**

- Never paste secrets into chat, tickets, or commits
- Never commit `.env`
- If you rotate a password, run `npm run db:seed-admin` locally/staging to update the admin hash

---

## 5. NPM scripts reference

| Command | When to use |
|---------|-------------|
| `npm run dev` | Local development server |
| `npm run build` | Verify production build before PR |
| `npm run lint` | Check code style before PR |
| `npm run db:generate` | After pulling schema changes |
| `npm run db:migrate` | Apply migrations in **development** |
| `npx prisma migrate deploy` | Apply migrations in **production/staging** (supervisor or approved dev) |
| `npm run db:seed-taxonomy` | Seed default taxonomy if table is empty |
| `npm run db:seed-admin` | Create/update admin user from `.env` |
| `npm run db:seed-content` | Seed default banners & about page (only if tables empty) |
| `npm run db:clear` | **Dangerous** — wipes data. Supervisor only. |

---

## 6. Data input workflows

Data input follows a **fixed order**. Skipping steps causes missing dropdown options or broken filters.

```
Step 1: 標籤管理 (Taxonomy)
    ↓
Step 2: 商品上架 (Products)
    ↓
Step 3: 網站內容 (Site content — banners, featured, about)
    ↓
Step 4: 交易紀錄 / 店賽報名 (Orders / Tournaments — as needed)
```

---

### 6.1 Step 1 — Taxonomy (`/admin/taxonomy`)

Taxonomy drives all dropdowns on the product forms and storefront filters.

| Kind (後台名稱) | Purpose | Example value | Example label |
|-----------------|---------|---------------|---------------|
| `SET_CODE` 系列編號 | Card set identifier | `M4` | `M4` |
| `RARITY` 稀有度 | Rarity tier | `SAR` | `SAR` |
| `CARD_NUMBER` 卡號 | Card number within a set | `001/120` | `#001/120` |
| `CARD_CATEGORY` 類型 | Card type | `POKEMON` | 寶可夢 |
| `POKEMON_ATTRIBUTE` 屬性 | Pokémon type | `火` | 火 |
| `PRODUCT_TYPE` 商品類型 | Product category | `BOOSTER_PACK` | 補充包 |

#### Adding a new card set (e.g. M4)

1. Go to **標籤管理** → tab **系列編號**
2. Add row: value `M4`, label `M4`
3. Set **卡號後綴** (card suffix), e.g. `120` — this defines numbers like `001/120`
4. Switch to **卡號** tab, select parent set `M4`
5. Enter min/max card numbers (e.g. 1–120) and batch-generate card numbers
6. Confirm **稀有度**, **類型**, **屬性** lists are complete for the set

#### Taxonomy rules

- **Always add taxonomy before listing products** for a new set
- Use consistent `value` strings (uppercase codes for sets/rarities; stored as-is in DB)
- **Deactivate** (`停用`) instead of deleting if products already reference a label
- Adjust **sort order** (up/down arrows) to control filter display order on the storefront
- After bulk taxonomy changes, refresh the admin page so dropdowns reload

---

### 6.2 Step 2 — Products (`/admin/products`)

Three tabs: **單卡上架**, **卡盒 / 週邊**, **已上架商品**.

#### A. Single cards (單卡上架)

| Field | Required | Notes |
|-------|----------|-------|
| 卡牌名稱 | Yes | Traditional Chinese name |
| 系列 | Yes | From `SET_CODE` taxonomy |
| 卡號 | Recommended | From `CARD_NUMBER` taxonomy for that set |
| 稀有度 | Yes | From `RARITY` taxonomy |
| 類型 | Yes | 寶可夢 / 訓練家 / 物品 / 能量 / 場地 |
| 屬性 | If Pokémon | From `POKEMON_ATTRIBUTE` |
| 售價 / 庫存 | Yes | HKD, integer stock |
| 圖片 | Yes | JPG/PNG/WebP/GIF, max 5 MB |
| 閃卡 | Optional | Checkbox for foil variant |

**Image workflow:**

1. Prepare card scan/image (clear, cropped, consistent aspect ratio)
2. Upload via the form — file goes to `public/uploads/products/`
3. Alternatively, place images in `public/TCG_Images/<SET>/` (e.g. `M4/001.png`) for team reference; you still upload through admin for the live product record

**Naming convention for local image folders:**

```
public/TCG_Images/M4/001.png   → card #001 in set M4
public/TCG_Images/M4/002.png
...
```

#### B. Sealed products & accessories (卡盒 / 週邊)

| Product type | `PRODUCT_TYPE` value | Notes |
|--------------|---------------------|-------|
| Booster pack | `BOOSTER_PACK` | |
| Sealed box | `SEALED_BOX` | |
| Gift box | `GIFT_BOX` | |
| Accessory | `ACCESSORY` | Sleeves, binders, etc. |

Required: name, image, price, stock. Link to a set code when applicable.

#### C. Managing existing products (已上架商品)

- **Edit** — update price, stock, image, metadata
- **Delete** — removes product permanently; confirm with supervisor if orders exist
- Stock is decremented automatically when Stripe checkout completes (via webhook)

#### Product data quality checklist

- [ ] Set code matches taxonomy
- [ ] Card number format matches set suffix (e.g. `045/120`)
- [ ] Price is in HKD, reasonable vs. market
- [ ] Stock reflects physical inventory
- [ ] Image is correct card/product
- [ ] No duplicate listings (search **已上架商品** first)

---

### 6.3 Step 3 — Site content (`/admin/content`)

Three sub-tabs:

#### 首頁輪播 (Home banners)

- Upload banner images (saved to `public/uploads/banners/`)
- Set title, subtitle, link (`href`), gradient overlay, active flag
- Order matters — first banner shows first in carousel

#### 熱門商品 (Featured products)

- **Auto mode:** shows latest products (default)
- **Manual mode:** pick specific product IDs to feature on homepage
- Save after changes

#### 關於我們 (About page)

- Page title, subtitle, content sections (JSON-backed)
- Store address (ZH/EN), hours, MTR directions
- Google Maps: paste **iframe `src` URL** only (no API key needed)
- Toggle **顯示門市資訊** to show/hide store block

Run `npm run db:seed-content` only on a fresh database to populate defaults.

---

### 6.4 Step 4 — Orders (`/admin/orders`)

| Status | Meaning | Typical action |
|--------|---------|----------------|
| `PENDING` | Awaiting payment | No action; Stripe handles payment |
| `PAID` | Payment confirmed | Prepare shipment |
| `SHIPPED` | Dispatched | Update when courier collects |
| `COMPLETED` | Delivered / picked up | Final state |
| `CANCELLED` | Cancelled | Refund handled in Stripe Dashboard |

**Intern rule:** Update status to reflect fulfilment. Do **not** manually change prices or invent orders. Payment issues → escalate to supervisor + Stripe Dashboard.

---

### 6.5 Step 5 — Tournaments (`/admin/tournaments`)

1. **Create** — title, format, max players, entry fee (HKD), location, start time, registration deadline
2. **Monitor** registrations — expand row to see player name, email, phone
3. Update tournament status as event progresses (`OPEN` → `FULL` → `IN_PROGRESS` → `COMPLETED`)

---

## 7. Development guide (for dev interns)

### 7.1 Repository structure

```
src/
  app/              Pages and API routes (App Router)
    admin/          Admin UI (protected by middleware)
    api/            Public and admin APIs
  components/       React components (admin/, cart/, layout/, ui/)
  lib/              Business logic (prisma, stripe, taxonomy, checkout)
  providers/        React context (cart, taxonomy)
  generated/prisma/ Prisma client (auto-generated — do not edit)
prisma/
  schema.prisma     Database schema
  migrations/       SQL migrations
  seed-*.ts         Seed scripts
public/
  uploads/          Admin-uploaded images (products, banners)
  TCG_Images/       Team card image library (organizational)
docs/               Documentation (this file)
```

### 7.2 Key files to know

| Area | Files |
|------|-------|
| Auth / admin guard | `src/middleware.ts`, `src/auth.config.ts`, `src/lib/auth-server.ts` |
| Products API | `src/app/api/admin/products/` |
| Taxonomy | `src/lib/taxonomy-db.ts`, `src/components/admin/taxonomy-manager.tsx` |
| Site content | `src/lib/site-content.ts`, `src/components/admin/site-content-manager.tsx` |
| Checkout / Stripe | `src/lib/checkout.ts`, `src/lib/stripe.ts`, `src/app/api/checkout/` |
| Uploads | `src/app/api/admin/upload/route.ts` |

### 7.3 Making schema changes

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (creates migration locally)
3. Run `npm run db:generate`
4. Commit **both** `schema.prisma` and `prisma/migrations/<timestamp>_*`
5. Open PR — supervisor runs `prisma migrate deploy` on staging/production

**Never** use `db:push` on production. Use migrations.

### 7.4 Next.js note

This project uses **Next.js 16** with breaking changes from earlier versions. Before changing framework-level code, read guides in `node_modules/next/dist/docs/`.

---

## 8. Git workflow

```
main (production) — https://github.com/Yoasb-kwok/TCG_Website
  └── feature/<your-name>-<short-description>
```

1. Pull latest `main`
2. Create branch: `feature/alex-add-m4-taxonomy`
3. Make focused changes; commit with clear messages
4. Run `npm run lint` and `npm run build` before PR
5. Open pull request with:
   - **Summary** — what and why
   - **Test plan** — steps you verified
6. Wait for review; address comments
7. Supervisor merges and deploys

### Commit message style

```
Add M4 card number batch to taxonomy seed

Fix featured products not saving when manual mode is enabled
```

### What not to commit

- `.env`
- `public/uploads/**` (runtime uploads — confirm with team policy)
- Large binary dumps unless explicitly requested
- `node_modules/`, `.next/`

---

## 9. Deployment (supervisor-led; devs should understand)

Typical hosting: **Vercel** + managed PostgreSQL (Supabase / Neon).

| Step | Command / action |
|------|------------------|
| Env vars | Set all `.env.example` variables in Vercel project settings |
| Build | `npm run build` (runs `prisma generate` automatically) |
| Migrations | `npx prisma migrate deploy` against production DB |
| Stripe webhook | Point to `https://<domain>/api/webhooks/stripe` |
| App URL | Set `NEXT_PUBLIC_APP_URL` to production domain |

**Uploads on Vercel:** Files in `public/uploads/` are ephemeral on serverless — for production, plan migration to object storage (S3, Supabase Storage). Escalate if uploads disappear after deploy.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Admin redirects to `/login` | Not logged in or session expired | Log in again at `/login` |
| Redirect to `/` with `?error=forbidden` | User role is `USER`, not `ADMIN` | Supervisor runs `db:seed-admin` or updates role in DB |
| Dropdowns empty on product form | Taxonomy not seeded | `npm run db:seed-taxonomy` |
| "Prisma 尚未包含 TaxonomyOption" | Stale Prisma client | `npm run db:generate` then restart `npm run dev` |
| Upload fails | File > 5 MB or wrong type | Compress image; use JPG/PNG/WebP/GIF |
| Products not on storefront | No stock, or DB not configured | Check stock > 0; verify `DATABASE_URL` |
| Checkout works but stock unchanged | Webhook not configured | Supervisor checks Stripe webhook + `STRIPE_WEBHOOK_SECRET` |
| Changes not visible on site | Browser cache / need rebuild | Hard refresh; on prod wait for deploy |

---

## 11. Do's and don'ts

### Do

- Add taxonomy **before** products for every new set
- Double-check card number, price, and image before saving
- Keep a spreadsheet mirror of inventory until confident in the system
- Ask supervisor before deleting products or taxonomy in use
- Report duplicate listings and incorrect orders promptly

### Don't

- Share admin credentials between interns
- Run `db:clear` or raw SQL deletes without approval
- Change `AUTH_SECRET` or Stripe keys without supervisor
- Push directly to `main`
- Commit `.env` or customer PII

---

## 12. Escalation

| Issue | Escalate to |
|-------|-------------|
| Cannot log in / locked out | Supervisor (password reset via `db:seed-admin`) |
| Payment failure, refund | Supervisor + Stripe Dashboard |
| Site down / deploy failure | Supervisor |
| Data loss / wrong migration | Supervisor immediately |
| Customer complaint on order | Supervisor with order ID |

---

## 13. Weekly routine (suggested)

| Day | Task |
|-----|------|
| Mon | Review weekend orders; update statuses to `SHIPPED` / `COMPLETED` |
| Tue–Thu | New product data entry per intake sheet |
| Fri | Audit: spot-check 5 random products vs. physical stock |
| Ongoing | Add taxonomy for upcoming sets before release day |

---

## 14. Quick links

| Resource | URL |
|----------|-----|
| GitHub repository | https://github.com/Yoasb-kwok/TCG_Website |
| Local site | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| Login | http://localhost:3000/login |
| Stripe Dashboard | https://dashboard.stripe.com |
| Prisma docs | https://www.prisma.io/docs |

---

## 15. Document maintenance

Update this SOP when:

- New admin pages or workflows are added
- Environment variables change
- Deployment platform or upload strategy changes
- Onboarding feedback highlights recurring confusion

**Owner:** Yoasb-kwok (project lead)  
**Repository:** https://github.com/Yoasb-kwok/TCG_Website  
**Review cadence:** Quarterly or after major releases
