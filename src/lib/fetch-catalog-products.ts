import type { CatalogSearchHit, ProductSort, ProductWithVariants } from "@/lib/types";

export interface CatalogQuery {
  search?: string;
  type?: string;
  setCodes?: string[];
  inStock?: boolean;
  sort?: ProductSort;
}

export interface CatalogPage {
  products: ProductWithVariants[];
  total: number;
  page: number;
  totalPages: number;
  complete: boolean;
  catalogCards: CatalogSearchHit[];
  catalogTotal: number;
}

const MAX_PAGES = 40;

function toParams(query: CatalogQuery, page: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  const search = query.search?.trim();
  if (search) params.set("search", search);
  if (query.type) params.set("type", query.type);
  if (query.inStock) params.set("inStock", "true");
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  for (const code of query.setCodes ?? []) {
    if (code) params.append("setCode", code);
  }
  return params;
}

async function readCatalogPage(params: URLSearchParams): Promise<CatalogPage> {
  const res = await fetch(`/api/products?${params}`);
  if (!res.ok) throw new Error("讀取商品失敗");
  const data = (await res.json()) as {
    products?: ProductWithVariants[];
    total?: number;
    page?: number;
    totalPages?: number;
    catalog?: { cards?: CatalogSearchHit[]; total?: number };
  };
  const products = data.products ?? [];
  const total = data.total ?? products.length;
  const page = data.page ?? 1;
  const totalPages = Math.max(1, data.totalPages ?? 1);
  return {
    products,
    total,
    page,
    totalPages,
    complete: page >= totalPages,
    catalogCards: data.catalog?.cards ?? [],
    catalogTotal: data.catalog?.total ?? 0,
  };
}

/** One page, or every page of a search so POS does not hide matches past the first screen. */
export async function fetchCatalogProducts(
  query: CatalogQuery,
  options?: { page?: number; pageSize?: number; all?: boolean },
): Promise<CatalogPage> {
  const pageSize = options?.pageSize ?? 100;
  if (!options?.all) {
    return readCatalogPage(toParams(query, options?.page ?? 1, pageSize));
  }

  const products: ProductWithVariants[] = [];
  let page = 1;
  let total = 0;
  let totalPages = 1;
  let catalogCards: CatalogSearchHit[] = [];
  let catalogTotal = 0;
  do {
    const next = await readCatalogPage(toParams(query, page, pageSize));
    products.push(...next.products);
    total = next.total;
    totalPages = next.totalPages;
    if (page === 1) {
      catalogCards = next.catalogCards;
      catalogTotal = next.catalogTotal;
    }
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return {
    products,
    total,
    page: 1,
    totalPages,
    complete: page > totalPages,
    catalogCards,
    catalogTotal,
  };
}

export async function fetchAllAdminProducts<T>(search: string): Promise<{
  products: T[];
  total: number;
  complete: boolean;
}> {
  const products: T[] = [];
  let page = 1;
  let total = 0;
  let totalPages = 1;
  do {
    const params = new URLSearchParams({
      search,
      page: String(page),
      pageSize: "100",
    });
    const res = await fetch(`/api/admin/products?${params}`);
    if (!res.ok) throw new Error("讀取商品失敗");
    const data = (await res.json()) as {
      products?: T[];
      total?: number;
      totalPages?: number;
    };
    products.push(...(data.products ?? []));
    total = data.total ?? products.length;
    totalPages = Math.max(1, data.totalPages ?? 1);
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return { products, total, complete: page > totalPages };
}
