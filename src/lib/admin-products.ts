import { getPrisma } from "@/lib/prisma";
import { taxonomyFromCard } from "@/lib/card-taxonomy";
import { getTaxonomyLabel } from "@/lib/taxonomy-db";
import {
  getSortIndexFromMap,
  getTaxonomySortMaps,
} from "@/lib/taxonomy-db";
import { slugifyProduct } from "@/lib/product-slug";

export interface ManualSingleInput {
  name: string;
  setCode: string;
  cardNumber?: string;
  rarityTier: string;
  cardCategory: string;
  pokemonType?: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl: string;
  isFoil?: boolean;
}

export interface ManualSealedInput {
  name: string;
  type: string;
  setCode?: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl: string;
}

export interface ManualAccessoryInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

function buildSku(slug: string, suffix: string) {
  return `${slug}-${suffix}`.slice(0, 64);
}

export async function createManualSingle(input: ManualSingleInput) {
  const prisma = getPrisma();
  const slug = slugifyProduct(
    input.name,
    `${input.setCode}-${input.cardNumber ?? Date.now().toString(36)}`,
  );
  const condition = "Near Mint (NM)";
  const sku = buildSku(slug, input.isFoil ? "foil" : "nm");

  const taxonomy = taxonomyFromCard({
    setCode: input.setCode,
    rarityTier: input.rarityTier,
    name: input.name,
  });
  const sortMaps = await getTaxonomySortMaps();

  const description =
    input.description ??
    [
      input.setCode,
      input.cardNumber ? `#${input.cardNumber}` : null,
      input.cardCategory,
      input.pokemonType,
    ]
      .filter(Boolean)
      .join(" · ");

  return prisma.product.create({
    data: {
      name: input.name,
      slug,
      description,
      type: "SINGLE",
      cardSet: input.setCode,
      cardNumber: input.cardNumber ?? null,
      rarity: input.rarityTier,
      setCode: taxonomy.setCode,
      rarityTier: taxonomy.rarityTier,
      cardCategory: input.cardCategory,
      setSortIndex: getSortIndexFromMap(
        sortMaps.setCode,
        taxonomy.setCode,
        999,
      ),
      raritySortIndex: getSortIndexFromMap(
        sortMaps.rarityTier,
        taxonomy.rarityTier,
        99,
      ),
      pokemonType: input.pokemonType ?? null,
      language: "zh-HK",
      images: {
        create: {
          url: input.imageUrl,
          alt: input.name,
          sortOrder: 0,
        },
      },
      variants: {
        create: {
          condition,
          isFoil: input.isFoil ?? false,
          price: input.price,
          stock: input.stock,
          sku,
        },
      },
    },
    include: { variants: true, images: true },
  });
}

export async function createManualSealed(input: ManualSealedInput) {
  const prisma = getPrisma();
  const slug = slugifyProduct(input.name, input.type);
  const sku = buildSku(slug, "sealed");
  const setCode = input.setCode ?? null;
  const sortMaps = await getTaxonomySortMaps();
  const typeLabel = await getTaxonomyLabel("PRODUCT_TYPE", input.type);

  return prisma.product.create({
    data: {
      name: input.name,
      slug,
      description:
        input.description ??
        [setCode, typeLabel !== "—" ? typeLabel : null].filter(Boolean).join(" · "),
      type: input.type,
      cardSet: setCode,
      setCode,
      setSortIndex: setCode
        ? getSortIndexFromMap(sortMaps.setCode, setCode, 999)
        : 999,
      language: "zh-HK",
      images: {
        create: {
          url: input.imageUrl,
          alt: input.name,
          sortOrder: 0,
        },
      },
      variants: {
        create: {
          condition: "Sealed",
          isFoil: false,
          price: input.price,
          stock: input.stock,
          sku,
        },
      },
    },
    include: { variants: true, images: true },
  });
}

export async function createManualAccessory(input: ManualAccessoryInput) {
  const prisma = getPrisma();
  const slug = slugifyProduct(input.name, Date.now().toString(36));
  const sku = buildSku(slug, "acc");

  return prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      type: "ACCESSORY",
      language: "zh-HK",
      images: input.imageUrl
        ? {
            create: {
              url: input.imageUrl,
              alt: input.name,
              sortOrder: 0,
            },
          }
        : undefined,
      variants: {
        create: {
          condition: "New",
          isFoil: false,
          price: input.price,
          stock: input.stock,
          sku,
        },
      },
    },
    include: { variants: true, images: true },
  });
}

export async function updateManualSingle(
  productId: string,
  variantId: string,
  input: Omit<ManualSingleInput, "imageUrl"> & { imageUrl?: string },
) {
  const prisma = getPrisma();
  const taxonomy = taxonomyFromCard({
    setCode: input.setCode,
    rarityTier: input.rarityTier,
    name: input.name,
  });
  const sortMaps = await getTaxonomySortMaps();

  const description =
    input.description ??
    [
      input.setCode,
      input.cardNumber ? `#${input.cardNumber}` : null,
      input.cardCategory,
      input.pokemonType,
    ]
      .filter(Boolean)
      .join(" · ");

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description,
        cardSet: input.setCode,
        cardNumber: input.cardNumber ?? null,
        rarity: input.rarityTier,
        setCode: taxonomy.setCode,
        rarityTier: taxonomy.rarityTier,
        cardCategory: input.cardCategory,
        setSortIndex: getSortIndexFromMap(
          sortMaps.setCode,
          taxonomy.setCode,
          999,
        ),
        raritySortIndex: getSortIndexFromMap(
          sortMaps.rarityTier,
          taxonomy.rarityTier,
          99,
        ),
        pokemonType: input.pokemonType ?? null,
        images: input.imageUrl
          ? {
              deleteMany: {},
              create: {
                url: input.imageUrl,
                alt: input.name,
                sortOrder: 0,
              },
            }
          : undefined,
      },
    }),
    prisma.productVariant.update({
      where: { id: variantId },
      data: {
        price: input.price,
        stock: input.stock,
        isFoil: input.isFoil ?? false,
      },
    }),
  ]);

  return prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, images: true },
  });
}

export async function updateManualSealed(
  productId: string,
  variantId: string,
  input: Omit<ManualSealedInput, "imageUrl"> & { imageUrl?: string },
) {
  const prisma = getPrisma();
  const setCode = input.setCode ?? null;
  const sortMaps = await getTaxonomySortMaps();
  const typeLabel = await getTaxonomyLabel("PRODUCT_TYPE", input.type);

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description:
          input.description ??
          [setCode, typeLabel !== "—" ? typeLabel : null]
            .filter(Boolean)
            .join(" · "),
        type: input.type,
        cardSet: setCode,
        setCode,
        setSortIndex: setCode
          ? getSortIndexFromMap(sortMaps.setCode, setCode, 999)
          : 999,
        images: input.imageUrl
          ? {
              deleteMany: {},
              create: {
                url: input.imageUrl,
                alt: input.name,
                sortOrder: 0,
              },
            }
          : undefined,
      },
    }),
    prisma.productVariant.update({
      where: { id: variantId },
      data: { price: input.price, stock: input.stock },
    }),
  ]);

  return prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, images: true },
  });
}

export async function updateManualAccessory(
  productId: string,
  variantId: string,
  input: ManualAccessoryInput,
) {
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description: input.description,
        images: input.imageUrl
          ? {
              deleteMany: {},
              create: {
                url: input.imageUrl,
                alt: input.name,
                sortOrder: 0,
              },
            }
          : undefined,
      },
    }),
    prisma.productVariant.update({
      where: { id: variantId },
      data: { price: input.price, stock: input.stock },
    }),
  ]);

  return prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, images: true },
  });
}

/** @deprecated 保留舊 API 相容；請改用 createManualSingle */
export async function createManualProduct(input: {
  name: string;
  type: string;
  description?: string;
  cardSet?: string;
  imageUrl?: string;
  price: number;
  stock: number;
  condition?: string;
}) {
  if (input.type === "SINGLE") {
    throw new Error("請使用手動單卡上架表單");
  }
  if (input.type === "ACCESSORY") {
    return createManualAccessory({
      name: input.name,
      description: input.description,
      price: input.price,
      stock: input.stock,
      imageUrl: input.imageUrl,
    });
  }
  return createManualSealed({
    name: input.name,
    type: input.type,
    setCode: input.cardSet,
    price: input.price,
    stock: input.stock,
    description: input.description,
    imageUrl: input.imageUrl ?? "/placeholder-product.svg",
  });
}
