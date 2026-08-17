import { parse } from "csv-parse/sync";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { taxonomyFromCard } from "@/lib/card-taxonomy";
import { getTaxonomySortMaps, getSortIndexFromMap } from "@/lib/taxonomy-db";
import { slugifyProduct } from "@/lib/product-slug";

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
  return ["true", "1", "yes", "y", "是", "閃"].includes(
    value.trim().toLowerCase(),
  );
}

/** CSV 欄位順序（同時用作範本 header） */
export const CSV_COLUMNS = [
  "name",
  "type",
  "setCode",
  "rarityTier",
  "cardNumber",
  "cardSet",
  "rarity",
  "cardCategory",
  "pokemonType",
  "condition",
  "isFoil",
  "price",
  "stock",
] as const;

/** 產生範本 CSV（header + 一行範例） */
export function generateTemplateCsv(): string {
  const header = CSV_COLUMNS.join(",");
  const example = [
    "皮卡丘",
    "SINGLE",
    "SV3",
    "R",
    "045",
    "SV3",
    "R",
    "POKEMON",
    "雷",
    "Near Mint (NM)",
    "false",
    "50",
    "10",
  ].join(",");
  return `\uFEFF${header}\n${example}\n`;
}

export async function importProductsFromCsv(
  csvText: string,
): Promise<CsvImportResult> {
  if (!isDatabaseConfigured()) {
    throw new Error("請先設定 DATABASE_URL");
  }

  const prisma = getPrisma();

  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch {
    throw new Error("CSV 格式錯誤，無法解析");
  }

  if (records.length === 0) {
    return { created: 0, skipped: 0, errors: [] };
  }

  // 預載現有 slug 和 SKU，避免逐行查詢
  const [existingProducts, existingVariants] = await Promise.all([
    prisma.product.findMany({ select: { slug: true } }),
    prisma.productVariant.findMany({ select: { sku: true } }),
  ]);
  const existingSlugs = new Set(existingProducts.map((p) => p.slug));
  const existingSkus = new Set(existingVariants.map((v) => v.sku));

  const sortMaps = await getTaxonomySortMaps();

  // 追蹤本批次已建立的 slug/SKU，避免 CSV 內重複
  const batchSlugs = new Set<string>();
  const batchSkus = new Set<string>();

  let created = 0;
  let skipped = 0;
  const errors: CsvImportError[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +2: row 1 = header

    try {
      // --- 必填欄位驗證 ---
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
      if (!Number.isFinite(stock) || stock < 0) {
        errors.push({ row: rowNum, message: `庫存格式錯誤: "${row.stock}"` });
        continue;
      }

      const isFoil = parseBoolean(row.isFoil);

      // --- 依 type 決定 slug/sku 後綴、condition、taxonomy ---
      let suffix: string;
      let condition: string;
      let skuSuffix: string;
      let taxonomyData: ReturnType<typeof taxonomyFromCard> | null;

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
        taxonomyData = taxonomyFromCard({
          setCode,
          rarityTier,
          name,
        });
      } else if (type === "ACCESSORY") {
        suffix = `${i}-${Date.now().toString(36)}`;
        condition = row.condition?.trim() || "New";
        skuSuffix = "acc";
        taxonomyData = null;
      } else {
        // BOOSTER_PACK, GIFT_BOX, SEALED_BOX 等
        const setCode = row.setCode?.trim() || null;
        suffix = type;
        condition = row.condition?.trim() || "Sealed";
        skuSuffix = "sealed";
        taxonomyData = setCode
          ? taxonomyFromCard({ setCode, name })
          : null;
      }

      const slug = slugifyProduct(name, suffix);

      // --- 檢查 slug 唯一性 ---
      if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
        skipped++;
        continue;
      }

      const sku = `${slug}-${skuSuffix}`.slice(0, 64);

      // --- 檢查 SKU 唯一性 ---
      if (existingSkus.has(sku) || batchSkus.has(sku)) {
        skipped++;
        continue;
      }

      // --- 組合 product data ---
      const data: Record<string, unknown> = {
        name,
        slug,
        type,
        language: "zh-HK",
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
        const setCode = row.setCode!.trim();
        const cardNumber = row.cardNumber?.trim();
        const cardCategory = row.cardCategory?.trim() || "POKEMON";
        const pokemonType = row.pokemonType?.trim() || null;

        data.cardSet = setCode;
        data.cardNumber = cardNumber || null;
        data.rarity = row.rarity?.trim() || row.rarityTier?.trim() || null;
        data.setCode = taxonomyData.setCode;
        data.rarityTier = taxonomyData.rarityTier;
        data.cardCategory = cardCategory;
        data.setSortIndex = getSortIndexFromMap(
          sortMaps.setCode,
          taxonomyData.setCode,
          999,
        );
        data.raritySortIndex = getSortIndexFromMap(
          sortMaps.rarityTier,
          taxonomyData.rarityTier,
          99,
        );
        data.pokemonType = pokemonType;

        data.description = [
          setCode,
          cardNumber ? `#${cardNumber}` : null,
          cardCategory,
          pokemonType,
        ]
          .filter(Boolean)
          .join(" · ");
      } else if (taxonomyData) {
        const setCode = row.setCode?.trim() || null;
        data.cardSet = setCode;
        data.setCode = taxonomyData.setCode;
        data.setSortIndex = getSortIndexFromMap(
          sortMaps.setCode,
          taxonomyData.setCode,
          999,
        );
      }

      // --- 建立 ---
      await prisma.product.create({
        data: data as Parameters<typeof prisma.product.create>[0]["data"],
      });

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
