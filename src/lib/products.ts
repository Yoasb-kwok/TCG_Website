import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { taxonomyFromCard } from "@/lib/card-taxonomy";
import {
  getSortIndexFromMap,
  getTaxonomySortMaps,
} from "@/lib/taxonomy-db";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
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
  /// ADR-006: Game type slug for scoping products (e.g. "pokemon", "one-piece")
  gameType?: string;
}

function enrichProduct<T extends ProductWithVariants>(p: T): T {
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
        return a.name.localeCompare(b.name, "zh-HK");
      });
    case "rarityTier":
      return list.sort((a, b) => {
        const ra = getSortIndexFromMap(rarityMap, a.rarityTier, 99);
        const rb = getSortIndexFromMap(rarityMap, b.rarityTier, 99);
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, "zh-HK");
      });
    case "priceAsc":
      return list.sort((a, b) => {
        const pa = Math.min(...a.variants.map((v) => v.price));
        const pb = Math.min(...b.variants.map((v) => v.price));
        return pa - pb;
      });
    case "priceDesc":
      return list.sort((a, b) => {
        const pa = Math.min(...a.variants.map((v) => v.price));
        const pb = Math.min(...b.variants.map((v) => v.price));
        return pb - pa;
      });
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

  return {
    cardSets,
    rarities,
    pokemonTypes,
    setCodes,
    rarityTiers,
  };
}

function filterDemoProducts(filters: ProductFilters): ProductsResponse {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;
  const sort = filters.sort ?? "newest";

  let products = DEMO_PRODUCTS.map(enrichProduct);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.cardSet?.toLowerCase().includes(q) ||
        p.cardNumber?.toLowerCase().includes(q) ||
        p.setCode?.toLowerCase().includes(q) ||
        p.rarityTier?.toLowerCase().includes(q) ||
        p.rarity?.toLowerCase().includes(q),
    );
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

function prismaOrderBy(sort: ProductSort = "newest") {
  switch (sort) {
    case "setCode":
      return [{ setSortIndex: "asc" as const }, { createdAt: "desc" as const }];
    case "rarityTier":
      return [{ raritySortIndex: "asc" as const }, { createdAt: "desc" as const }];
    default:
      return [{ createdAt: "desc" as const }];
  }
}

export async function getProducts(filters: ProductFilters): Promise<ProductsResponse> {
  if (!isDatabaseConfigured()) {
    return filterDemoProducts(filters);
  }

  try {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 24;
    const skip = (page - 1) * pageSize;
    const sort = filters.sort ?? "newest";

    const where: Record<string, unknown> = {};

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
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { cardSet: { contains: filters.search, mode: "insensitive" } },
        { cardNumber: { contains: filters.search, mode: "insensitive" } },
        { setCode: { contains: filters.search, mode: "insensitive" } },
        { rarityTier: { contains: filters.search, mode: "insensitive" } },
        { rarity: { contains: filters.search, mode: "insensitive" } },
      ];
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

    // ADR-006: Resolve game type slug to ID for filtering
    let gameTypeId: string | undefined;
    if (filters.gameType) {
      const game = await prisma.gameType.findUnique({
        where: { slug: filters.gameType },
      });
      if (!game) {
        return {
          products: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          filters: { cardSets: [], rarities: [], pokemonTypes: [], setCodes: [], rarityTiers: [] },
        };
      }
      gameTypeId = game.id;
      where.gameTypeId = gameTypeId;
    }

    // ADR-005: Fetch global thresholds for buffer zone filtering
    const shopSetting = await prisma.shopSetting.findUnique({
      where: { id: "default" },
    });
    const globalCritical = shopSetting?.defaultCriticalThreshold ?? 2;

    let [products, total, allProducts] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: { orderBy: { price: "asc" } },
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: prismaOrderBy(sort),
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        select: {
          cardSet: true,
          rarity: true,
          pokemonType: true,
          cardCategory: true,
          setCode: true,
          rarityTier: true,
        },
      }),
    ]);

    // ADR-005: Buffer zone — filter out products where ALL variants have sellable <= 0
    // sellable = stock - (variant.criticalThreshold ?? globalCritical)
    // Also replace stock with sellable quantity for customer-facing display
    const bufferedProducts = (products as Array<{
      id: string;
      variants: Array<{ stock: number; criticalThreshold: number | null }>;
    }>).filter((p) =>
      p.variants.some((v) => v.stock - (v.criticalThreshold ?? globalCritical) > 0),
    );

    // Replace variant stock with sellable quantity (customer-facing)
    for (const p of bufferedProducts) {
      for (const v of p.variants) {
        v.stock = Math.max(0, v.stock - (v.criticalThreshold ?? globalCritical));
      }
    }

    let mapped = (bufferedProducts as unknown as ProductWithVariants[]).map(enrichProduct);

    if (sort === "priceAsc" || sort === "priceDesc") {
      mapped = sortProducts(mapped, sort);
    }

    const allMapped = allProducts.map((p) =>
      enrichProduct({
        ...p,
        id: "",
        name: "",
        slug: "",
        description: null,
        type: "SINGLE",
        cardNumber: null,
        language: "zh-HK",
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
    };
  } catch {
    return filterDemoProducts(filters);
  }
}
