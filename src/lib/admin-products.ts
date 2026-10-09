import { normalizeBarcode } from "@/lib/pos-scan";
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
  barcode?: string | null;
}

export interface ManualSealedInput {
  name: string;
  type: string;
  setCode?: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl: string;
  barcode?: string | null;
}

export interface ManualAccessoryInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  barcode?: string | null;
}

function buildSku(slug: string, suffix: string) {
  return `${slug}-${suffix}`.slice(0, 64);
}

export function describeProductWriteError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.startsWith("條碼")) return err.message;
  const code =
    typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code === "P2002") {
    const target = (err as { meta?: { target?: unknown } }).meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : [];
    if (fields.some((field) => field.includes("barcode"))) return "條碼已被其他商品使用";
    if (fields.some((field) => field.includes("sku"))) return "SKU 已被使用";
    return "資料重複，請檢查條碼或 SKU";
  }
  return err instanceof Error ? err.message : fallback;
}

export async function setVariantBarcode(variantId: string, value: unknown) {
  const barcode = normalizeBarcode(value);
  await ensureBarcodeAvailable(barcode, variantId);
  await getPrisma().productVariant.update({
    where: { id: variantId },
    data: { barcode },
  });
}

async function barcodeUpdateData(value: unknown, variantId: string) {
  if (value === undefined) return {};
  const barcode = normalizeBarcode(value);
  await ensureBarcodeAvailable(barcode, variantId);
  return { barcode };
}

async function ensureBarcodeAvailable(barcode: string | null, exceptVariantId?: string) {
  if (!barcode) return;
  const taken = await getPrisma().productVariant.findFirst({
    where: {
      barcode: { equals: barcode, mode: "insensitive" },
      ...(exceptVariantId ? { id: { not: exceptVariantId } } : {}),
    },
    select: { id: true },
  });
  if (taken) throw new Error("條碼已被其他商品使用");
}

export async function createManualSingle(input: ManualSingleInput) {
  const prisma = getPrisma();
  const barcode = normalizeBarcode(input.barcode);
  await ensureBarcodeAvailable(barcode);
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
          barcode,
        },
      },
    },
    include: { variants: true, images: true },
  });
}

export async function createManualSealed(input: ManualSealedInput) {
  const prisma = getPrisma();
  const barcode = normalizeBarcode(input.barcode);
  await ensureBarcodeAvailable(barcode);
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
          barcode,
        },
      },
    },
    include: { variants: true, images: true },
  });
}

export async function createManualAccessory(input: ManualAccessoryInput) {
  const prisma = getPrisma();
  const barcode = normalizeBarcode(input.barcode);
  await ensureBarcodeAvailable(barcode);
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
          barcode,
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
  const barcodeUpdate = await barcodeUpdateData(input.barcode, variantId);
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
        ...barcodeUpdate,
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
  const barcodeUpdate = await barcodeUpdateData(input.barcode, variantId);
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
      data: { price: input.price, stock: input.stock, ...barcodeUpdate },
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
  const barcodeUpdate = await barcodeUpdateData(input.barcode, variantId);

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
      data: { price: input.price, stock: input.stock, ...barcodeUpdate },
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
