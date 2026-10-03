# ADR-006: Game Type System (Multi-TCG Support)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-14 |
| **Decision Maker** | Lucas |
| **Related** | ADR-005 (Inventory Stocking System) |

---

## Context

TCGHK currently sells only Pokémon TCG products. The entire data model assumes Pokémon: the `TaxonomyKind` enum has `POKEMON_ATTRIBUTE`, the `Product` model has `pokemonType` and `cardCategory` fields, and the storefront has a single `/products` page with Pokémon-specific filters (series codes like M3/SV3, rarities like MUR/SAR/AR, attributes like 草/火/水).

The shop plans to expand to **One Piece TCG** and **Disney Lorcana**. These games share the same structural concepts (cards, sets, rarities, attributes) but use different value names. For example:
- Pokémon attributes: 草、火、水、雷
- One Piece attributes: Red、Blue、Green
- Lorcana attributes: Amber、Amethyst、Ruby

This ADR defines a "Game Type" layer that sits above taxonomy and products, enabling admin to manage multiple TCG brands without creating separate pages or components per game.

---

## Decision 1: Game Type Data Model — New `GameType` Table

**Decision:** Create a new `GameType` table with proper foreign keys to both `Product` and `TaxonomyOption`.

```prisma
model GameType {
  id        String   @id @default(uuid())
  name      String   // Display name: "Pokémon", "One Piece", "Disney Lorcana"
  slug      String   @unique // URL slug: "pokemon", "one-piece", "lorcana"
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  products       Product[]
  taxonomyOptions TaxonomyOption[]
}
```

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. New `GameType` table (chosen)** | Clean separation. Proper FKs. Extensible metadata (logo, color, sort order). Admin CRUDs game types as first-class entities. | New table + migration + admin UI. | ✅ |
| B. New `TaxonomyKind.GAME_TYPE` | Reuses existing taxonomy infrastructure. No new table. | Overloads TaxonomyOption (flat key-value tags, not a grouping entity). Awward FK joins on string value. Can't attach metadata. | ❌ |

### Context

Game Type is a top-level organizational concept — it determines which taxonomy options apply, which product fields are relevant, and how the storefront is organized. It is not a "tag" like rarity or set code. It deserves its own table with proper relationships.

### Consequences
- **Positive:** Clean data model. Extensible (can add logo, color, metadata later). Proper referential integrity via FKs.
- **Negative:** New table + migration + admin CRUD page needed.
- **Review trigger:** If game types never need metadata beyond name/slug, consider simplifying.

---

## Decision 2: Keep Existing Product Fields As-Is

**Decision:** The existing Pokémon-specific fields on `Product` (`pokemonType`, `cardCategory`, `setCode`, `rarityTier`, etc.) stay unchanged. Non-Pokémon products leave irrelevant fields null. Taxonomy values are scoped per game via `gameTypeId` on `TaxonomyOption`. For taxonomy kinds that don't apply to a game (e.g., `POKEMON_ATTRIBUTE` for One Piece), admin creates an "N/A" option.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Keep fields as-is (chosen)** | Zero data migration of existing values. Ships fastest. Taxonomy scoping handles value separation. | Field names are misleading (`pokemonType` on a One Piece card). Future developers may be confused. | ✅ |
| B. Rename to generic (`pokemonType` → `primaryAttribute`) | Clean, future-proof schema. | Requires migrating all data + updating every code reference (filters, forms, search, sort, card display). High blast radius. | ❌ |
| C. Flexible attributes table (`ProductAttribute(key, value)`) | Maximum flexibility per game. | Most complex. Breaks Prisma type safety. Overkill for 3 games. | ❌ |

### Context

All three target games (Pokémon, One Piece, Lorcana) are TCGs with similar structure: cards with rarities, sets, and attributes. The existing fields map well structurally — they just hold different string values per game. Since `TaxonomyOption` will get a `gameTypeId` FK, the *values* are already scoped per game. The field name on `Product` is just a column that holds any string.

### Consequences
- **Positive:** No data migration of existing values. Minimal code changes. Ships fast.
- **Negative:** `pokemonType` field name is misleading for non-Pokémon products. Filter panel must conditionally hide/show filters based on game type.
- **Review trigger:** If a 4th game has fundamentally different attribute structure, revisit with Option B or C.

---

## Decision 3: Storefront Routing — Dynamic Route `/products/[gameType]`

**Decision:** Use a dynamic route `/products/[gameType]` where `[gameType]` is the GameType slug. The shared `MarketplaceShell` component renders based on the URL param. No new files are needed when adding a game — the route works as long as the GameType exists in the database.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. Tabs/segmented control on `/products` (single page) | Simplest. Zero routing changes. | No deep-linking to specific games. Weaker SEO. Can't share `/products/one-piece` links. | ❌ |
| **B. Dynamic route `/products/[gameType]` (chosen)** | Deep-linkable. Each game gets own metadata/title (SEO). Dynamic route means no code changes when adding a game. | Slightly more routing setup. Need to validate game type slug. | ✅ |
| C. Top-level sections (`/pokemon`, `/one-piece`) | Most SEO-friendly. Feels like distinct shops. | Most work. Requires nav changes per game. Over-engineered. | ❌ |

### Context

The user wants game types to be data-driven, not page-driven. A dynamic route satisfies this: when admin creates a new GameType, `/products/that-new-game` works immediately without any code changes.

### Consequences
- **Positive:** Deep-linkable URLs. SEO-friendly per-game pages. Data-driven — no code changes per game.
- **Negative:** Need slug validation (404 for invalid game types). Filter panel and product queries must always apply the `gameTypeId` from the URL.
- **Review trigger:** If SEO per game becomes critical, consider adding structured data (JSON-LD) per game type page.

---

## Decision 4: `TaxonomyOption.gameTypeId` — Nullable

**Decision:** `TaxonomyOption.gameTypeId` is nullable. Shared taxonomy kinds (like `PRODUCT_TYPE` — SINGLE, SEALED_BOX, BOOSTER_PACK, ACCESSORY) have `gameTypeId = null`, meaning they apply to all games. Game-specific kinds (SET_CODE, RARITY, CARD_CATEGORY, POKEMON_ATTRIBUTE) have a proper `gameTypeId` FK.

```prisma
model TaxonomyOption {
  // ... existing fields ...
  gameTypeId String?
  gameType   GameType? @relation(fields: [gameTypeId], references: [id])
}
```

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Nullable `gameTypeId` (chosen)** | Shared taxonomy (PRODUCT_TYPE) stays game-agnostic. No duplication. Query: `WHERE gameTypeId IS NULL OR gameTypeId = ?`. | Slightly more complex queries (OR condition). | ✅ |
| B. Required `gameTypeId` | Every option explicitly belongs to a game. Simpler mental model. | PRODUCT_TYPE values duplicated per game (3 games × 4 types = 12 rows). Drift risk. | ❌ |

### Context

`PRODUCT_TYPE` (SINGLE, SEALED_BOX, BOOSTER_PACK, ACCESSORY) is a universal TCG concept — a single card is a single card regardless of game. Making `gameTypeId` nullable lets these be defined once and shared.

### Consequences
- **Positive:** No duplication of shared taxonomy. Clean separation of shared vs game-specific.
- **Negative:** Queries need `OR gameTypeId IS NULL` for shared options.
- **Review trigger:** If shared taxonomy grows beyond PRODUCT_TYPE, ensure the query pattern still performs well.

---

## Decision 5: `/products` Index — Redirect to Default Game

**Decision:** The bare `/products` URL redirects (302) to the default game's route (`/products/pokemon`). The default game is the first active GameType ordered by `sortOrder`.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Redirect to default game (chosen)** | Simplest. Customer always lands in a concrete game section. | Hides non-default games unless they click tabs. | ✅ |
| B. "All games" view | Shows all products. Flexible. | Filter panel shows mixed taxonomy from all games. Confusing. | ❌ |
| C. Game selector landing page | Clean separation. Good first-time experience. | Extra page to build. Over-engineered for 2-3 games. | ❌ |

### Context

Pokémon is the dominant game and will remain so for the foreseeable future. Redirecting to `/products/pokemon` ensures existing links and bookmarks still work seamlessly.

### Consequences
- **Positive:** Simplest implementation. Existing `/products` links still work.
- **Negative:** Customers don't see other games unless they notice the tabs.
- **Review trigger:** If non-Pokémon games grow significantly, revisit with Option C (landing page).

---

## Decision 6: Game Switching UI — Tabs at Top of Products Page

**Decision:** A horizontal row of game-type tab buttons at the top of the products page (below the page title). Each tab links to `/products/[slug]`. The active game is highlighted. Tabs are auto-generated from the GameType table.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Tabs at top of products page (chosen)** | Always visible while browsing. Clear visual context. Auto-generates from GameType table. No nav bar changes. | Not visible from other pages. Takes vertical space. | ✅ |
| B. Dropdown in site nav bar | Accessible from every page. Standard e-commerce pattern. | Slightly hidden. | ❌ |
| C. Both (nav dropdown + tabs) | Best UX. | Most work. Two components to maintain. | ❌ |

### Consequences
- **Positive:** Simple, visible, auto-generated.
- **Negative:** Only visible on the products page.
- **Review trigger:** If customers frequently switch games from other pages, add nav bar dropdown.

---

## Decision 7: Admin Product Creation — Game Type Dropdown on Each Upload Form

**Decision:** Each existing product upload form (single card, sealed, accessory) gets a "遊戲" dropdown at the top. Selecting a game filters all dependent taxonomy dropdowns (set code, rarity, card category) to that game's values. Default selection is Pokémon.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Game type dropdown on each form (chosen)** | Minimal disruption to existing flow. Taxonomy filters automatically. | Switching game mid-form resets selections. | ✅ |
| B. Game type tab above existing tabs | Clear two-step hierarchy. | Adds a layer of tabs. More clicks. | ❌ |
| C. Game type as unfiltered form field | Least code change. | Admin sees mixed taxonomy. Error-prone. | ❌ |

### Consequences
- **Positive:** Existing admin flow preserved. Taxonomy automatically scoped.
- **Negative:** Switching game mid-form loses taxonomy selections.
- **Review trigger:** If form-switching friction grows, consider Option B.

---

## Decision 8: Home Page — Keep Unified "熱門商品"

**Decision:** The home page's featured products section stays as a single unified grid. Admin picks any products regardless of game. No per-game sections at launch.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Keep unified (chosen)** | Simplest. No home page changes. Works with existing `HomeFeaturedProduct` table. | Doesn't prominently signal multi-game support. | ✅ |
| B. Per-game sections | Clear multi-game signal. Better discoverability. | More queries. More UI to build. | ❌ |
| C. Unified + game badge on cards | Minimal change. Visual distinction. | Doesn't solve discoverability. | ❌ |

### Context

At launch, Pokémon will dominate the catalog. One Piece and Lorcana products will be added gradually. Per-game sections can be added later once there are enough products to fill them.

### Consequences
- **Positive:** No home page work needed.
- **Negative:** Customers don't immediately see multi-game support from the home page.
- **Review trigger:** When non-Pokémon catalog exceeds ~50 products, revisit with per-game sections.

---

## Decision 9: Search — Stays Within Current Game

**Decision:** Search on `/products/[gameType]` only queries products for that game. The `gameTypeId` filter from the URL route param is always applied alongside the search term.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Search within current game (chosen)** | Predictable. Fast. Relevant results. Matches mental model. | Can't do global search across games. | ✅ |
| B. Search across all games | More flexible. | Confusing — Pokémon results on One Piece page. Breaks per-game scope. | ❌ |

### Consequences
- **Positive:** Clean, predictable search behavior.
- **Negative:** No global search across games. Can be added later as a nav-bar search feature.
- **Review trigger:** If customers frequently search across games, add a global search component.

---

## Decision 10: Admin Game Type Management — New Sidebar Item

**Decision:** A new sidebar item "遊戲管理" at `/admin/games` provides full CRUD for GameType (create, edit, reorder, activate/deactivate, delete with warning about linked products/taxonomy).

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. New sidebar item `/admin/games` (chosen)** | Clean separation. Easy to find. Follows existing admin pattern. | One more sidebar item. | ✅ |
| B. Tab on products admin page | Keeps product-related items together. | Products page already has 5 tabs. Getting crowded. | ❌ |
| C. Section on taxonomy page | Groups with taxonomy. | Mixes two different concerns. | ❌ |

### Consequences
- **Positive:** Clear admin flow: create game → manage taxonomy → upload products.
- **Negative:** One more admin page to build.
- **Review trigger:** If game types need complex settings (per-game config), expand this page.

---

## Decision 11: Taxonomy Admin — Game Type Filter Dropdown

**Decision:** The taxonomy admin page gets a game type filter dropdown at the top ("全部" / "Pokémon" / "One Piece" / "Lorcana"). Selecting a game filters displayed taxonomy options. When creating a new option, the selected game is pre-filled (or "共用/shared" for null `gameTypeId` kinds like PRODUCT_TYPE).

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Game type filter dropdown (chosen)** | Clean. Focuses on one game at a time. Prevents mistakes. | Small UI addition. | ✅ |
| B. No filter — flat list | Least code change. | Messy with 3+ games. Risk of errors. | ❌ |

### Consequences
- **Positive:** Manageable admin experience as games grow.
- **Negative:** Minor UI work on the taxonomy page.
- **Review trigger:** If taxonomy per game becomes large, consider per-game sub-pages.

---

## Decision 12: Tournaments — Out of Scope

**Decision:** Tournaments do not get a `gameTypeId` in this feature. They remain implicitly Pokémon. When non-Pokémon tournaments are planned, add `gameTypeId` to the Tournament model as a follow-up.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Out of scope for now (chosen)** | Keeps feature focused. No migration risk on tournament system. | Later requires separate migration. | ✅ |
| B. Add gameTypeId to Tournament now | Future-proofs tournament system. | YAGNI. Adds scope. | ❌ |

### Consequences
- **Positive:** Focused scope. Lower risk.
- **Negative:** Separate migration needed later.
- **Review trigger:** When planning non-Pokémon tournaments, add `gameTypeId` to Tournament model.

---

## Consequence Summary

### Schema Changes Required

| Change | Type | Risk |
|--------|------|------|
| `GameType` table | CREATE TABLE | Low |
| `Product.gameTypeId` | ADD COLUMN (required, backfill to Pokémon) | Medium — requires data migration |
| `TaxonomyOption.gameTypeId` | ADD COLUMN (nullable) | Low — backfill game-specific to Pokémon, PRODUCT_TYPE stays null |
| Default GameType "Pokémon" seed | INSERT | Low |

### New API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/games` | List active game types (for storefront tabs) |
| `GET/POST/PATCH/DELETE /api/admin/games` | Game type CRUD (admin) |
| `GET /api/products?gameType=pokemon` | Filter products by game type (modify existing) |
| `GET /api/taxonomy?gameType=pokemon` | Filter taxonomy by game type (modify existing) |

### New UI Pages/Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Game type tabs | `src/components/marketplace/game-tabs.tsx` | Tabs at top of products page |
| `/products/[gameType]/page.tsx` | `src/app/products/[gameType]/page.tsx` | Dynamic route for game-specific marketplace |
| `/admin/games/page.tsx` | `src/app/admin/(panel)/games/page.tsx` | Admin game type CRUD |
| Game type dropdown | Added to existing product upload forms | Filters taxonomy by selected game |
| Game type filter | Added to existing taxonomy admin page | Filters taxonomy options by game |

### Migration Steps

1. Create `GameType` table
2. Insert default "Pokémon" game type (slug: `pokemon`, sortOrder: 0)
3. Add `gameTypeId` column to `Product` (required, default to Pokémon's id)
4. Add `gameTypeId` column to `TaxonomyOption` (nullable)
5. Backfill: all existing `Product.gameTypeId` → Pokémon
6. Backfill: all existing `TaxonomyOption` — `PRODUCT_TYPE` kind → null (shared), all other kinds → Pokémon
7. Move `/products/page.tsx` → `/products/[gameType]/page.tsx`, add redirect on `/products`

---

## Review Triggers

| Condition | Decision to Revisit |
|-----------|-------------------|
| 4th game with fundamentally different attributes | Decision 2 (field structure) |
| Non-Pokémon tournaments planned | Decision 12 (tournament game type) |
| SEO per game becomes critical | Decision 5 (landing page instead of redirect) |
| Non-Pokémon catalog exceeds ~50 products | Decision 8 (per-game home page sections) |
| Customers frequently search across games | Decision 9 (global search) |
| Admin taxonomy page becomes unwieldy per game | Decision 11 (per-game sub-pages) |
| Customers switch games from non-products pages | Decision 6 (nav bar dropdown) |
