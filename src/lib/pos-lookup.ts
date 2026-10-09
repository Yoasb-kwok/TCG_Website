import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { matchPosScan, type PosScanMatch } from "@/lib/pos-scan";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { enrichProduct } from "@/lib/products";
import type { ProductWithVariants } from "@/lib/types";

export type PosLookupMatch = PosScanMatch<ProductWithVariants>;

function demoMatch(raw: string): PosLookupMatch | null {
  return matchPosScan(DEMO_PRODUCTS.map(enrichProduct), raw);
}

export async function lookupPosScan(raw: string): Promise<PosLookupMatch | null> {
  const query = raw.trim();
  if (!query) return null;
  if (!isDatabaseConfigured()) return demoMatch(query);

  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { variants: { some: { barcode: { equals: query, mode: "insensitive" } } } },
        { variants: { some: { sku: { equals: query, mode: "insensitive" } } } },
        { cardNumber: { equals: query, mode: "insensitive" } },
      ],
    },
    include: {
      variants: { orderBy: { price: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  const mapped = products.map((product) =>
    enrichProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      type: product.type,
      cardSet: product.cardSet,
      cardNumber: product.cardNumber,
      rarity: product.rarity,
      setCode: product.setCode,
      rarityTier: product.rarityTier,
      cardCategory: product.cardCategory,
      pokemonType: product.pokemonType,
      language: product.language,
      externalCardId: product.externalCardId,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        condition: variant.condition,
        isFoil: variant.isFoil,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        barcode: variant.barcode,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
      })),
    }),
  );

  return matchPosScan(mapped, query);
}
