import type { ReadonlyURLSearchParams } from "next/navigation";
import type { FilterState } from "@/components/marketplace/filter-panel";
import type { ProductSort, ProductType } from "@/lib/types";

export const DEFAULT_FILTERS: FilterState = {
  types: [],
  rarities: [],
  cardSets: [],
  pokemonTypes: [],
  setCodes: [],
  rarityTiers: [],
  inStock: false,
  priceRange: [0, 5000],
  sort: "newest",
};

/** 從 URL search params 讀取 FilterState */
export function filtersFromSearchParams(
  sp: ReadonlyURLSearchParams | URLSearchParams,
): FilterState {
  return {
    types: sp.getAll("type") as ProductType[],
    rarities: sp.getAll("rarity"),
    cardSets: sp.getAll("cardSet"),
    pokemonTypes: sp.getAll("pokemonType"),
    setCodes: sp.getAll("setCode"),
    rarityTiers: sp.getAll("rarityTier"),
    inStock: sp.get("inStock") === "true",
    priceRange: [
      Math.max(0, Number(sp.get("minPrice") ?? "0") || 0),
      Math.min(5000, Number(sp.get("maxPrice") ?? "5000") || 5000),
    ],
    sort: (sp.get("sort") as ProductSort | null) ?? "newest",
  };
}

/** 將 FilterState 寫入 URL search params（先清除舊值再寫入新值） */
export function writeFiltersToParams(
  params: URLSearchParams,
  filters: FilterState,
): void {
  params.delete("type");
  params.delete("rarity");
  params.delete("cardSet");
  params.delete("pokemonType");
  params.delete("setCode");
  params.delete("rarityTier");
  params.delete("inStock");
  params.delete("minPrice");
  params.delete("maxPrice");
  params.delete("sort");

  filters.types.forEach((t) => params.append("type", t));
  filters.rarities.forEach((r) => params.append("rarity", r));
  filters.cardSets.forEach((s) => params.append("cardSet", s));
  filters.pokemonTypes.forEach((p) => params.append("pokemonType", p));
  filters.setCodes.forEach((c) => params.append("setCode", c));
  filters.rarityTiers.forEach((t) => params.append("rarityTier", t));

  if (filters.inStock) params.set("inStock", "true");
  if (filters.priceRange[0] > 0)
    params.set("minPrice", String(filters.priceRange[0]));
  if (filters.priceRange[1] < 5000)
    params.set("maxPrice", String(filters.priceRange[1]));
  if (filters.sort !== "newest") params.set("sort", filters.sort);
}

/** 計算已啟用的篩選條件數量（用於 badge 顯示） */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  count += filters.types.length;
  count += filters.rarities.length;
  count += filters.cardSets.length;
  count += filters.pokemonTypes.length;
  count += filters.setCodes.length;
  count += filters.rarityTiers.length;
  if (filters.inStock) count++;
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000) count++;
  if (filters.sort !== "newest") count++;
  return count;
}
