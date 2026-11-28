import { catalogFrameProduct } from "@/lib/catalog-frame";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { isSupportedCatalogGame, productMatchesGame } from "@/lib/games";
import { taxonomyFromCard } from "@/lib/card-taxonomy";
import { resolveCatalogProductSearch } from "@/lib/catalog-product-search";
import { productMatchesSearch, productSearchOr } from "@/lib/product-search";
import { getSortIndexFromMap } from "@/lib/taxonomy-db";
import {
  compareMinPrice,
  compareProductIds,
  minListedPrice,
  productListOrderBy,
  rankProductIdsByMinPrice,
} from "@/lib/product-list-order";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  ProductType,
  ProductWithVariants,
  ProductsResponse,
  ProductSort,
} from "@/lib/types";

export interface ProductFilters {
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
  cardSet?: string;
  rarity?: string;
  setCodes?: string[];
  rarityTiers?: string[];
  pokemonType?: string;
  type?: ProductType;
  inStock?: boolean;
  search?: string;
  language?: string;
  sort?: ProductSort;
  game?: string;
}

export function enrichProduct<T extends ProductWithVariants>(p: T): T {
  const t = taxonomyFromCard({
    externalCardId: p.externalCardId ?? p.variants[0]?.sku,
    rarity: p.rarity,
    name: p.name,
    setCode: p.setCode,
    rarityTier: p.rarityTier,
  });
  return {
    ...p,
    setCode: p.setCode ?? t.setCode,
    rarityTier: p.rarityTier ?? t.rarityTier,
  };
}

function sortProducts(
  products: ProductWithVariants[],
  sort: ProductSort = "newest",
  sortMaps?: { setCode: Record<string, number>; rarityTier: Record<string, number> },
): ProductWithVariants[] {
  const list = [...products];
  const setMap = sortMaps?.setCode ?? {};
  const rarityMap = sortMaps?.rarityTier ?? {};
  switch (sort) {
    case "setCode":
      return list.sort((a, b) => {
        const sa = getSortIndexFromMap(setMap, a.setCode, 999);
        const sb = getSortIndexFromMap(setMap, b.setCode, 999);
        if (sa !== sb) return sa - sb;
        const byName = a.name.localeCompare(b.name, "zh-HK");
        return byName === 0 ? compareProductIds(a.id, b.id) : byName;
      });
    case "rarityTier":
      return list.sort((a, b) => {
        const ra = getSortIndexFromMap(rarityMap, a.rarityTier, 99);
        const rb = getSortIndexFromMap(rarityMap, b.rarityTier, 99);
        if (ra !== rb) return ra - rb;
        const byName = a.name.localeCompare(b.name, "zh-HK");
        return byName === 0 ? compareProductIds(a.id, b.id) : byName;
      });
    case "priceAsc":
    case "priceDesc":
      return list.sort((a, b) =>
        compareMinPrice(
          { id: a.id, minPrice: minListedPrice(a.variants.map((variant) => variant.price)) },
          { id: b.id, minPrice: minListedPrice(b.variants.map((variant) => variant.price)) },
          sort === "priceAsc" ? "asc" : "desc",
        ),
      );
    default:
      return list;
  }
}

function buildFilterMeta(products: ProductWithVariants[]) {
  const cardSets = [...new Set(products.map((p) => p.cardSet).filter(Boolean))] as string[];
  const rarities = [...new Set(products.map((p) => p.rarity).filter(Boolean))] as string[];
  const pokemonTypes = [
    ...new Set(products.map((p) => p.pokemonType).filter(Boolean)),
  ] as string[];
  const setCodes = [...new Set(products.map((p) => p.setCode).filter(Boolean))] as string[];
  const rarityTiers = [
    ...new Set(products.map((p) => p.rarityTier).filter(Boolean)),
  ] as string[];
  const types = [...new Set(products.map((p) => p.type).filter(Boolean))] as string[];
  const languages = [...new Set(products.map((p) => p.language).filter(Boolean))] as string[];

  return {
    cardSets,
    rarities,
    pokemonTypes,
    setCodes,
    rarityTiers,
    types,
    languages,
  };
}

function emptyProducts(filters: ProductFilters): ProductsResponse {
  return {
    products: [],
    total: 0,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 24,
    totalPages: 1,
    filters: {
      cardSets: [],
      rarities: [],
      pokemonTypes: [],
      setCodes: [],
      rarityTiers: [],
      types: [],
      languages: [],
    },
  };
}

function filterDemoProducts(filters: ProductFilters): ProductsResponse {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;
  const sort = filters.sort ?? "newest";

  let products = DEMO_PRODUCTS.map(enrichProduct);

  if (filters.search) {
    products = products.filter((p) => productMatchesSearch(p, filters.search!));
  }

  if (filters.type) {
    products = products.filter((p) => p.type === filters.type);
  }

  if (filters.cardSet) {
    products = products.filter((p) =>
      p.cardSet?.toLowerCase().includes(filters.cardSet!.toLowerCase()),
    );
  }

  if (filters.rarity) {
    products = products.filter((p) => p.rarity === filters.rarity);
  }

  if (filters.setCodes?.length) {
    products = products.filter((p) => p.setCode && filters.setCodes!.includes(p.setCode));
  }

  if (filters.rarityTiers?.length) {
    products = products.filter(
      (p) => p.rarityTier && filters.rarityTiers!.includes(p.rarityTier),
    );
  }

  if (filters.pokemonType) {
    products = products.filter((p) => p.pokemonType === filters.pokemonType);
  }

  if (filters.language) {
    products = products.filter((p) => p.language === filters.language);
  }

  if (filters.game) {
    products = products.filter((p) => productMatchesGame(p.game, filters.game));
  }

  if (filters.inStock) {
    products = products.filter((p) => p.variants.some((v) => v.stock > 0));
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    products = products.filter((p) => {
      const minVariantPrice = Math.min(...p.variants.map((v) => v.price));
      if (filters.minPrice !== undefined && minVariantPrice < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && minVariantPrice > filters.maxPrice) {
        return false;
      }
      return true;
    });
  }

  products = sortProducts(products, sort);

  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = products.slice(start, start + pageSize);

  return {
    products: paginated,
    total,
    page,
    pageSize,
    totalPages,
    filters: buildFilterMeta(DEMO_PRODUCTS.map(enrichProduct)),
  };
}

function productDetailInclude() {
  return {
    variants: { orderBy: { price: "asc" as const } },
    images: { orderBy: { sortOrder: "asc" as const } },
  };
}

/**
 * Price is on variants. Rank the filtered ids first, then load one page in
 * that order, so skip/take cannot drop a cheap product that shares createdAt
 * with the rest of the import.
 */
async function findProductsOrderedByMinPrice(
  prisma: ReturnType<typeof getPrisma>,
  where: Prisma.ProductWhereInput,
  sort: "priceAsc" | "priceDesc",
  skip: number,
  take: number,
) {
  const ranked = await prisma.product.findMany({
    where,
    select: {
      id: true,
      variants: { select: { price: true } },
    },
  });
  const ids = rankProductIdsByMinPrice(
    ranked.map((product) => ({
      id: product.id,
      prices: product.variants.map((variant) => variant.price),
    })),
    sort,
  ).slice(skip, skip + take);
  if (ids.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: productDetailInclude(),
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function getProducts(filters: ProductFilters): Promise<ProductsResponse> {
  if (!isSupportedCatalogGame(filters.game)) {
    return emptyProducts(filters);
  }

  if (!isDatabaseConfigured()) {
    return filterDemoProducts(filters);
  }

  try {
    const page = Math.max(1, filters.page ?? 1);
    const requestedSize = filters.pageSize ?? 24;
    const pageSize = Math.min(100, Math.max(1, Number.isFinite(requestedSize) ? requestedSize : 24));
    const skip = (page - 1) * pageSize;
    const sort = filters.sort ?? "newest";

    const where: Record<string, unknown> = {};
    let catalog: ProductsResponse["catalog"];

    if (filters.type) where.type = filters.type;
    if (filters.cardSet) {
      where.cardSet = { contains: filters.cardSet, mode: "insensitive" };
    }
    if (filters.rarity) where.rarity = filters.rarity;
    if (filters.setCodes?.length) {
      where.setCode = { in: filters.setCodes };
    }
    if (filters.rarityTiers?.length) {
      where.rarityTier = { in: filters.rarityTiers };
    }
    if (filters.pokemonType) where.pokemonType = filters.pokemonType;
    if (filters.language) where.language = filters.language;
    if (filters.search) {
      const or = productSearchOr(filters.search);
      const resolved = await resolveCatalogProductSearch(filters.search);
      if (resolved.total > 0) {
        catalog = { cards: resolved.cards, total: resolved.total };
      }
      const combined = [...or, ...resolved.productOr];
      if (combined.length > 0) where.OR = combined;
    }

    const variantWhere: Record<string, unknown> = {};
    if (filters.minPrice !== undefined) variantWhere.price = { gte: filters.minPrice };
    if (filters.maxPrice !== undefined) {
      variantWhere.price = {
        ...(variantWhere.price as object),
        lte: filters.maxPrice,
      };
    }
    if (filters.inStock) variantWhere.stock = { gt: 0 };

    if (Object.keys(variantWhere).length > 0) {
      where.variants = { some: variantWhere };
    }

    const prisma = getPrisma();
    const productWhere = where as Prisma.ProductWhereInput;
    const [products, total, allProducts] = await Promise.all([
      sort === "priceAsc" || sort === "priceDesc"
        ? findProductsOrderedByMinPrice(prisma, productWhere, sort, skip, pageSize)
        : prisma.product.findMany({
            where: productWhere,
            include: productDetailInclude(),
            orderBy: productListOrderBy(sort),
            skip,
            take: pageSize,
          }),
      prisma.product.count({ where: productWhere }),
      prisma.product.findMany({
        select: {
          cardSet: true,
          rarity: true,
          pokemonType: true,
          cardCategory: true,
          setCode: true,
          rarityTier: true,
          type: true,
          language: true,
        },
      }),
    ]);

    const mapped = (products as ProductWithVariants[]).map(enrichProduct);

    const allMapped = allProducts.map((p) =>
      enrichProduct({
        ...p,
        id: "",
        name: "",
        slug: "",
        description: null,
        type: p.type,
        cardNumber: null,
        language: p.language,
        variants: [],
        images: [],
      } as ProductWithVariants),
    );

    return {
      products: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      filters: buildFilterMeta(allMapped),
      ...(catalog ? { catalog } : {}),
    };
  } catch {
    return filterDemoProducts(filters);
  }
}

/** Figma smoke path uses the short slug. The seeded demo row keeps the demo- prefix. */
const STOREFRONT_SLUG_ALIASES: Record<string, string> = {
  "umbreon-vmax-evolving": "demo-umbreon-vmax-evolving",
};

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const demo = DEMO_PRODUCTS.find((product) => product.slug === slug);
  const framed = catalogFrameProduct(slug);

  if (!isDatabaseConfigured()) {
    return framed ? enrichProduct(framed) : demo ? enrichProduct(demo) : null;
  }

  try {
    const prisma = getPrisma();
    const include = productDetailInclude();
    const product =
      (await prisma.product.findUnique({ where: { slug }, include })) ??
      (STOREFRONT_SLUG_ALIASES[slug]
        ? await prisma.product.findUnique({
            where: { slug: STOREFRONT_SLUG_ALIASES[slug] },
            include,
          })
        : null);
    if (!product) return null;
    return enrichProduct(product as ProductWithVariants);
  } catch {
    return framed ? enrichProduct(framed) : demo ? enrichProduct(demo) : null;
  }
}
