import type { Prisma } from "@/generated/prisma/client";
import { parseCsvTable } from "@/lib/catalog-csv";
import { taxonomyFromCard } from "@/lib/card-taxonomy";
import { PRODUCT_CSV_COLUMNS, recordsToCsv } from "@/lib/csv-export";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { slugifyProduct } from "@/lib/product-slug";
import { getSortIndexFromMap, getTaxonomySortMaps } from "@/lib/taxonomy-db";

export interface CsvImportError {
  row: number;
  message: string;
}

export interface CsvImportResult {
  created: number;
  skipped: number;
  errors: CsvImportError[];
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "y", "是", "閃"].includes(value.trim().toLowerCase());
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

export async function importProductsFromCsv(csvText: string): Promise<CsvImportResult> {
  if (!isDatabaseConfigured()) {
    throw new Error("請先設定 DATABASE_URL");
  }

  const records = parseProductCsv(csvText.replace(/^\uFEFF/, ""));
  if (records.length === 0) {
    return { created: 0, skipped: 0, errors: [] };
  }

  const prisma = getPrisma();
  const [existingProducts, existingVariants] = await Promise.all([
    prisma.product.findMany({ select: { slug: true } }),
    prisma.productVariant.findMany({ select: { sku: true } }),
  ]);
  const existingSlugs = new Set(existingProducts.map((product) => product.slug));
  const existingSkus = new Set(existingVariants.map((variant) => variant.sku));
  const sortMaps = await getTaxonomySortMaps();
  const batchSlugs = new Set<string>();
  const batchSkus = new Set<string>();

  let created = 0;
  let skipped = 0;
  const errors: CsvImportError[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    try {
      const name = row.name?.trim();
      if (!name) {
        errors.push({ row: rowNum, message: "缺少商品名稱 (name)" });
        continue;
      }

      const type = row.type?.trim().toUpperCase();
      if (!type) {
        errors.push({ row: rowNum, message: "缺少商品類型 (type)" });
        continue;
      }

      const price = Number(row.price);
      const stock = Number(row.stock ?? "0");
      if (!Number.isFinite(price) || price < 0) {
        errors.push({ row: rowNum, message: `價格格式錯誤: "${row.price}"` });
        continue;
      }
      if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
        errors.push({ row: rowNum, message: `庫存格式錯誤: "${row.stock}"` });
        continue;
      }

      const isFoil = parseBoolean(row.isFoil);
      let suffix: string;
      let condition: string;
      let skuSuffix: string;
      let generatedDescription: string | null = null;
      let taxonomyData: ReturnType<typeof taxonomyFromCard> | null = null;

      if (type === "SINGLE") {
        const setCode = row.setCode?.trim();
        if (!setCode) {
          errors.push({ row: rowNum, message: "單卡缺少系列編號 (setCode)" });
          continue;
        }
        const rarityTier = row.rarityTier?.trim();
        if (!rarityTier) {
          errors.push({ row: rowNum, message: "單卡缺少稀有度 (rarityTier)" });
          continue;
        }

        const cardNumber = row.cardNumber?.trim() || Date.now().toString(36);
        suffix = `${setCode}-${cardNumber}`;
        condition = row.condition?.trim() || "Near Mint (NM)";
        skuSuffix = isFoil ? "foil" : "nm";
        taxonomyData = taxonomyFromCard({ setCode, rarityTier, name });
        const category = row.cardCategory?.trim() || "POKEMON";
        const pokemonType = row.pokemonType?.trim() || null;
        const printedNumber = row.cardNumber?.trim();
        generatedDescription = [setCode, printedNumber ? `#${printedNumber}` : null, category, pokemonType]
          .filter(Boolean)
          .join(" · ");
      } else if (type === "ACCESSORY") {
        suffix = `${i}-${Date.now().toString(36)}`;
        condition = row.condition?.trim() || "New";
        skuSuffix = "acc";
      } else {
        const setCode = row.setCode?.trim() || null;
        suffix = type;
        condition = row.condition?.trim() || "Sealed";
        skuSuffix = "sealed";
        taxonomyData = setCode ? taxonomyFromCard({ setCode, name }) : null;
      }

      const slug = slugifyProduct(name, suffix);
      if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
        skipped++;
        continue;
      }

      const sku = `${slug}-${skuSuffix}`.slice(0, 64);
      if (existingSkus.has(sku) || batchSkus.has(sku)) {
        skipped++;
        continue;
      }

      const data: Prisma.ProductCreateInput = {
        name,
        slug,
        type,
        language: "zh-HK",
        description: preferredDescription(row, generatedDescription),
        variants: {
          create: {
            condition,
            isFoil,
            price,
            stock,
            sku,
          },
        },
      };

      if (type === "SINGLE" && taxonomyData) {
        const setCode = row.setCode?.trim() ?? "";
        const cardNumber = row.cardNumber?.trim();
        data.cardSet = row.cardSet?.trim() || setCode;
        data.cardNumber = cardNumber || null;
        data.rarity = row.rarity?.trim() || row.rarityTier?.trim() || null;
        data.setCode = taxonomyData.setCode;
        data.rarityTier = taxonomyData.rarityTier;
        data.cardCategory = row.cardCategory?.trim() || "POKEMON";
        data.setSortIndex = getSortIndexFromMap(sortMaps.setCode, taxonomyData.setCode, 999);
        data.raritySortIndex = getSortIndexFromMap(
          sortMaps.rarityTier,
          taxonomyData.rarityTier,
          99,
        );
        data.pokemonType = row.pokemonType?.trim() || null;
      } else if (taxonomyData) {
        const setCode = row.setCode?.trim() || null;
        data.cardSet = row.cardSet?.trim() || setCode;
        data.setCode = taxonomyData.setCode;
        data.setSortIndex = getSortIndexFromMap(sortMaps.setCode, taxonomyData.setCode, 999);
      }

      await prisma.product.create({ data });
      batchSlugs.add(slug);
      batchSkus.add(sku);
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "建立失敗";
      errors.push({ row: rowNum, message });
    }
  }

  return { created, skipped, errors };
}
