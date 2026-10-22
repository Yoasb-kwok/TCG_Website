import type { ProductSort, ProductType, ProductsResponse } from "@/lib/types";
import type { ProductFilters } from "@/lib/products";

export const STOREFRONT_PAGE_SIZE = 24;
export const STOREFRONT_MAX_PRICE = 5000;

export interface FilterState {
  types: ProductType[];
  rarities: string[];
  cardSets: string[];
  pokemonTypes: string[];
  setCodes: string[];
  rarityTiers: string[];
  inStock: boolean;
  priceRange: [number, number];
  sort: ProductSort;
}

export const DEFAULT_STOREFRONT_FILTERS: FilterState = {
  types: [],
  rarities: [],
  cardSets: [],
  pokemonTypes: [],
  setCodes: [],
  rarityTiers: [],
  inStock: false,
  priceRange: [0, STOREFRONT_MAX_PRICE],
  sort: "newest",
};

interface SearchReader {
  get(name: string): string | null;
}

interface SearchListReader extends SearchReader {
  getAll(name: string): string[];
}

export function recordToURLSearchParams(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }
  return params;
}

/**
 * Query string the storefront sends to the catalog. URL filters are applied
 * before the in-page panel, matching the previous client request.
 */
export function storefrontRequestParams(
  url: SearchReader,
  filters: FilterState,
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(STOREFRONT_PAGE_SIZE));

  if (filters.inStock) params.set("inStock", "true");
  params.set(
    "minPrice",
    String(filters.priceRange[0] > 0 ? filters.priceRange[0] : 1),
  );
  if (filters.priceRange[1] < STOREFRONT_MAX_PRICE) {
    params.set("maxPrice", String(filters.priceRange[1]));
  }

  const urlType = url.get("type");
  const urlSet = url.get("cardSet");
  const urlLang = url.get("language");
  const urlSearch = url.get("search")?.trim();
  const urlGame = url.get("game")?.trim();

  if (urlType) params.set("type", urlType);
  if (urlSet) params.set("cardSet", urlSet);
  if (urlLang) params.set("language", urlLang);
  if (urlSearch) params.set("search", urlSearch);
  if (urlGame) params.set("game", urlGame);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

  for (const type of filters.types) params.append("type", type);
  for (const set of filters.cardSets) params.append("cardSet", set);
  for (const rarity of filters.rarities) params.append("rarity", rarity);
  for (const code of filters.setCodes) params.append("setCode", code);
  for (const tier of filters.rarityTiers) params.append("rarityTier", tier);
  for (const pokemonType of filters.pokemonTypes) params.append("pokemonType", pokemonType);

  return params;
}

export function productFiltersFromSearchParams(searchParams: SearchListReader): ProductFilters {
  const page = Number(searchParams.get("page") ?? "1");
  const requestedSize = Number(searchParams.get("pageSize") ?? "24");
  const pageSize = Number.isFinite(requestedSize)
    ? Math.min(100, Math.max(1, Math.floor(requestedSize)))
    : 24;
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const setCodes = searchParams.getAll("setCode").filter(Boolean);
  const rarityTiers = searchParams.getAll("rarityTier").filter(Boolean);
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "newest";

  return {
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 24 : pageSize,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    cardSet: searchParams.get("cardSet") ?? undefined,
    rarity: searchParams.get("rarity") ?? undefined,
    setCodes: setCodes.length ? setCodes : undefined,
    rarityTiers: rarityTiers.length ? rarityTiers : undefined,
    pokemonType: searchParams.get("pokemonType") ?? undefined,
    type: (searchParams.get("type") as ProductType | null) ?? undefined,
    inStock: searchParams.get("inStock") === "true",
    search: searchParams.get("search") ?? undefined,
    language: searchParams.get("language") ?? undefined,
    game: searchParams.get("game") ?? undefined,
    sort,
  };
}

/** The list currently on screen. A response for any other query is not shown. */
export function catalogForRequest(
  loaded: { key: string; data: ProductsResponse } | null,
  activeKey: string,
): ProductsResponse | null {
  if (!loaded || loaded.key !== activeKey) return null;
  return loaded.data;
}
