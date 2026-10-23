import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { CATALOG_FRAME_PRODUCTS, isGenericDemoCatalog } from "@/lib/catalog-frame";
import { getProducts } from "@/lib/products";
import {
  DEFAULT_STOREFRONT_FILTERS,
  productFiltersFromSearchParams,
  recordToURLSearchParams,
  storefrontRequestParams,
} from "@/lib/storefront-query";
import type { ProductWithVariants, ProductsResponse } from "@/lib/types";

export const metadata = {
  title: "商品",
};

function toClientCatalog(data: ProductsResponse): ProductsResponse {
  return JSON.parse(JSON.stringify(data)) as ProductsResponse;
}

function withFrameProducts(loaded: ProductsResponse, products: ProductWithVariants[]): ProductsResponse {
  return {
    ...loaded,
    products,
    total: products.length,
    totalPages: 1,
    filters: {
      ...loaded.filters,
      cardSets: [...new Set(products.map((product) => product.cardSet).filter(Boolean))] as string[],
      pokemonTypes: [...new Set(products.map((product) => product.pokemonType).filter(Boolean))] as string[],
      rarities: [...new Set(products.map((product) => product.rarity).filter(Boolean))] as string[],
      types: [...new Set(products.map((product) => product.type))],
    },
  };
}

const NARROWING_KEYS = [
  "search",
  "type",
  "cardSet",
  "rarity",
  "game",
  "language",
  "inStock",
  "setCode",
  "minPrice",
  "maxPrice",
] as const;

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
  const narrowed = NARROWING_KEYS.some((key) => raw[key]);
  const onlySealed =
    raw.type === "SEALED_BOX" && NARROWING_KEYS.every((key) => key === "type" || !raw[key]);
  const initialData =
    isGenericDemoCatalog(loaded.products) && !narrowed
      ? withFrameProducts(loaded, CATALOG_FRAME_PRODUCTS)
      : isGenericDemoCatalog(loaded.products) && onlySealed
        ? withFrameProducts(
            loaded,
            CATALOG_FRAME_PRODUCTS.filter((product) => product.type === "SEALED_BOX"),
          )
        : loaded;

  return <MarketplaceShell initialData={initialData} initialKey={initialKey} />;
}
