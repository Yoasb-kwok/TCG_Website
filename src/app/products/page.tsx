import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { CATALOG_FRAME_PRODUCTS, isGenericDemoCatalog } from "@/lib/catalog-frame";
import { getProducts } from "@/lib/products";
import {
  DEFAULT_STOREFRONT_FILTERS,
  productFiltersFromSearchParams,
  recordToURLSearchParams,
  storefrontRequestParams,
} from "@/lib/storefront-query";
import type { ProductsResponse } from "@/lib/types";

export const metadata = {
  title: "商品",
};

function toClientCatalog(data: ProductsResponse): ProductsResponse {
  return JSON.parse(JSON.stringify(data)) as ProductsResponse;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const request = storefrontRequestParams(
    recordToURLSearchParams(raw),
    DEFAULT_STOREFRONT_FILTERS,
    1,
  );
  const initialKey = request.toString();
  const loaded = toClientCatalog(
    await getProducts(productFiltersFromSearchParams(request)),
  );
  const narrowed = ["search", "type", "cardSet", "rarity", "game", "language", "inStock", "setCode", "minPrice", "maxPrice"].some(
    (key) => raw[key],
  );
  const initialData =
    !narrowed && isGenericDemoCatalog(loaded.products)
      ? {
          ...loaded,
          products: CATALOG_FRAME_PRODUCTS,
          total: CATALOG_FRAME_PRODUCTS.length,
          totalPages: 1,
          filters: {
            ...loaded.filters,
            cardSets: [...new Set(CATALOG_FRAME_PRODUCTS.map((product) => product.cardSet).filter(Boolean))] as string[],
            pokemonTypes: [...new Set(CATALOG_FRAME_PRODUCTS.map((product) => product.pokemonType).filter(Boolean))] as string[],
            rarities: [...new Set(CATALOG_FRAME_PRODUCTS.map((product) => product.rarity).filter(Boolean))] as string[],
            types: [...new Set(CATALOG_FRAME_PRODUCTS.map((product) => product.type))],
          },
        }
      : loaded;

  return <MarketplaceShell initialData={initialData} initialKey={initialKey} />;
}
