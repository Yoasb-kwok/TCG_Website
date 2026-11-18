import { parseCsvTable } from "@/lib/catalog-csv";
import { PRODUCT_CSV_COLUMNS, recordsToCsv } from "@/lib/csv-export";
import {
  classifyProductRows,
  type ImportCreateData,
  type ImportQuarantine,
  type ImportUpdateData,
} from "@/lib/product-import";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { readXlsxTable } from "@/lib/xlsx-sheet";
import { getTaxonomySortMaps } from "@/lib/taxonomy-db";

export interface CsvImportError {
  row: number;
  message: string;
}

export interface CsvImportResult {
  created: number;
  updated: number;
  skipped: number;
  quarantined: ImportQuarantine[];
  errors: CsvImportError[];
}

/**
 * A non-empty `description` cell is stored as written.
 * Blank cells fall back to the generated single-card summary.
 */
export function preferredDescription(
  row: { description?: string },
  generated: string | null,
): string | null {
  const imported = row.description?.trim();
  if (imported) return imported;
  const fallback = generated?.trim() ?? "";
  return fallback ? fallback : null;
}

/** Header plus one example row. The download route adds the UTF-8 BOM. */
export function generateTemplateCsv(): string {
  return recordsToCsv(
    [
      {
        name: "皮卡丘",
        type: "SINGLE",
        setCode: "SV3",
        rarityTier: "R",
        cardNumber: "045",
        cardSet: "SV3",
        rarity: "R",
        cardCategory: "POKEMON",
        pokemonType: "雷",
        condition: "Near Mint (NM)",
        isFoil: "false",
        price: "50",
        stock: "10",
        description: "特別插畫, 稀有",
        barcode: "4890000000045",
        extendedBarcode: "",
        cost: "30",
        wholesalePrice: "40",
        memberPrice: "0",
        memberDiscount: "是",
        pointsProduct: "是",
      },
    ],
    PRODUCT_CSV_COLUMNS,
  );
}

export function parseProductCsv(csvText: string): Record<string, string>[] {
  const table = parseCsvTable(csvText);
  if (table.length === 0) return [];

  const headers = table[0].map((header) => header.trim().replace(/^\uFEFF/, ""));
  if (!headers.some(Boolean)) {
    throw new Error("CSV 格式錯誤，無法解析");
  }

  return table.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });
}

async function createImportedProduct(data: ImportCreateData) {
  await getPrisma().product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      type: data.type,
      language: "zh-HK",
      cardSet: data.cardSet ?? null,
      cardNumber: data.cardNumber ?? null,
      rarity: data.rarity ?? null,
      setCode: data.setCode ?? null,
      rarityTier: data.rarityTier ?? null,
      cardCategory: data.cardCategory ?? null,
      setSortIndex: data.setSortIndex ?? 999,
      raritySortIndex: data.raritySortIndex ?? 99,
      pokemonType: data.pokemonType ?? null,
      variants: {
        create: {
          condition: data.condition,
          isFoil: data.isFoil,
          price: data.price,
          stock: data.stock,
          sku: data.sku,
          barcode: data.barcode,
          extendedBarcode: data.extendedBarcode,
          cost: data.cost,
          wholesalePrice: data.wholesalePrice,
          memberPrice: data.memberPrice,
          memberDiscount: data.memberDiscount,
          pointsProduct: data.pointsProduct,
        },
      },
    },
  });
}

async function updateImportedProduct(data: ImportUpdateData) {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.product.update({
      where: { id: data.productId },
      data: {
        name: data.name,
        type: data.type,
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    }),
    prisma.productVariant.update({
      where: { id: data.variantId },
      data: {
        price: data.price,
        stock: data.stock,
        ...(data.cost !== undefined ? { cost: data.cost } : {}),
        ...(data.wholesalePrice !== undefined ? { wholesalePrice: data.wholesalePrice } : {}),
        ...(data.memberPrice !== undefined ? { memberPrice: data.memberPrice } : {}),
        ...(data.memberDiscount !== undefined ? { memberDiscount: data.memberDiscount } : {}),
        ...(data.pointsProduct !== undefined ? { pointsProduct: data.pointsProduct } : {}),
        ...(data.extendedBarcode !== undefined ? { extendedBarcode: data.extendedBarcode } : {}),
      },
    }),
  ]);
}

export async function importProductTable(table: string[][]): Promise<CsvImportResult> {
  if (!isDatabaseConfigured()) {
    throw new Error("請先設定 DATABASE_URL");
  }
  if (table.length === 0) {
    return { created: 0, updated: 0, skipped: 0, quarantined: [], errors: [] };
  }

  const prisma = getPrisma();
  const [products, variants, sortMaps] = await Promise.all([
    prisma.product.findMany({ select: { slug: true } }),
    prisma.productVariant.findMany({
      select: { id: true, productId: true, sku: true, barcode: true, extendedBarcode: true },
    }),
    getTaxonomySortMaps(),
  ]);
  const plan = classifyProductRows(
    table,
    {
      slugs: products.map((product) => product.slug),
      skus: variants.map((variant) => variant.sku),
      variants: variants.map((variant) => ({
        variantId: variant.id,
        productId: variant.productId,
        barcode: variant.barcode,
        extendedBarcode: variant.extendedBarcode,
        sku: variant.sku,
      })),
    },
    sortMaps,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const quarantined: ImportQuarantine[] = [];
  const errors: CsvImportError[] = [];

  for (const decision of plan.decisions) {
    if (decision.action === "quarantine") {
      quarantined.push(decision.quarantine);
      continue;
    }
    if (decision.action === "skip") {
      skipped += 1;
      continue;
    }
    try {
      if (decision.action === "create") {
        await createImportedProduct(decision.data);
        created += 1;
      } else {
        await updateImportedProduct(decision.data);
        updated += 1;
      }
    } catch (err) {
      errors.push({
        row: decision.row,
        message: err instanceof Error ? err.message : "寫入失敗",
      });
    }
  }

  return { created, updated, skipped, quarantined, errors };
}

export async function importProductsFromCsv(csvText: string): Promise<CsvImportResult> {
  return importProductTable(parseCsvTable(csvText.replace(/^\uFEFF/, "")));
}

export async function importProductsFromXlsx(bytes: Uint8Array): Promise<CsvImportResult> {
  return importProductTable(await readXlsxTable(bytes));
}
