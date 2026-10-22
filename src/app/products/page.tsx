import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
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
  const initialData = toClientCatalog(
    await getProducts(productFiltersFromSearchParams(request)),
  );

  return <MarketplaceShell initialData={initialData} initialKey={initialKey} />;
}
