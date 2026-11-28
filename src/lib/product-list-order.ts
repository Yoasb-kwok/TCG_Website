import type { ProductSort } from "@/lib/types";

/**
 * SQL order for catalog skip/take.
 *
 * createdAt alone is not a unique key. The client import wrote every product
 * at one timestamp, and PostgreSQL may then repeat a row on a later page and
 * skip another. Each order ends with id.
 *
 * priceAsc and priceDesc also end with id, but the storefront does not page
 * those sorts with this order. Prisma can order a to-many relation by count
 * only, not by the cheapest variant, so those pages are ranked before skip/take.
 * This fallback stays unique if a caller still pages them in SQL.
 */
export type ProductListOrderKey =
  | { id: "asc" }
  | { createdAt: "asc" | "desc" }
  | { setSortIndex: "asc" | "desc" }
  | { raritySortIndex: "asc" | "desc" };

const idTieBreak: { id: "asc" } = { id: "asc" };

export function productListOrderBy(sort: ProductSort = "newest"): ProductListOrderKey[] {
  switch (sort) {
    case "setCode":
      return [{ setSortIndex: "asc" }, { createdAt: "desc" }, idTieBreak];
    case "rarityTier":
      return [{ raritySortIndex: "asc" }, { createdAt: "desc" }, idTieBreak];
    case "priceAsc":
    case "priceDesc":
      return [{ createdAt: "desc" }, idTieBreak];
    default:
      return [{ createdAt: "desc" }, idTieBreak];
  }
}

export function compareProductIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Cheapest variant. A product with no variants sorts after every priced row. */
export function minListedPrice(prices: readonly number[]): number | null {
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function compareMinPrice(
  a: { id: string; minPrice: number | null },
  b: { id: string; minPrice: number | null },
  direction: "asc" | "desc",
): number {
  if (a.minPrice == null && b.minPrice == null) return compareProductIds(a.id, b.id);
  if (a.minPrice == null) return 1;
  if (b.minPrice == null) return -1;
  if (a.minPrice !== b.minPrice) {
    return direction === "asc" ? a.minPrice - b.minPrice : b.minPrice - a.minPrice;
  }
  return compareProductIds(a.id, b.id);
}

/** Full ranking, then the caller slices the page. Equal prices stay in id order. */
export function rankProductIdsByMinPrice(
  products: readonly { id: string; prices: readonly number[] }[],
  sort: "priceAsc" | "priceDesc",
): string[] {
  const direction = sort === "priceAsc" ? "asc" : "desc";
  return products
    .map((product) => ({
      id: product.id,
      minPrice: minListedPrice(product.prices),
    }))
    .sort((a, b) => compareMinPrice(a, b, direction))
    .map((product) => product.id);
}
