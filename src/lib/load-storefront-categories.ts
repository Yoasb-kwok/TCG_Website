import { cache } from "react";
import { listCatalogSets } from "@/lib/catalog-query";
import { DEFAULT_CATALOG_GAME } from "@/lib/games";
import { isDatabaseConfigured } from "@/lib/prisma";
import { getProducts } from "@/lib/products";
import {
  buildPokemonL2Categories,
  FALLBACK_POKEMON_L2,
  type StorefrontCategoryLink,
} from "@/lib/storefront-categories";
import { listTaxonomyGrouped } from "@/lib/taxonomy-db";

async function readOptional<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

/** Pokémon L2 menu for the storefront. Uses sellable products, then catalog sets. */
export const loadPokemonL2Categories = cache(async (): Promise<StorefrontCategoryLink[]> => {
  try {
    const products = await getProducts({ page: 1, pageSize: 1, game: DEFAULT_CATALOG_GAME });
    const taxonomy = await readOptional(() => listTaxonomyGrouped(false), null);
    const catalogSets = isDatabaseConfigured()
      ? await readOptional(() => listCatalogSets(), [])
      : [];

    return buildPokemonL2Categories({
      types: products.filters.types,
      languages: products.filters.languages,
      cardSets: products.filters.cardSets,
      setCodes: products.filters.setCodes,
      typeLabels: taxonomy?.PRODUCT_TYPE ?? [],
      setLabels: taxonomy?.SET_CODE ?? [],
      catalogSets: catalogSets.map((set) => ({
        code: set.code,
        nameZhTw: set.nameZhTw,
        nameEn: set.nameEn,
      })),
    });
  } catch {
    return FALLBACK_POKEMON_L2.map((item) => ({ ...item }));
  }
});
