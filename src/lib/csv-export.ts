import JSZip from "jszip";
import { csvEscape } from "@/lib/catalog-csv";
import { excelCsvBytes } from "@/lib/csv-encoding";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** CSV columns for the product sheet. `description` is optional on import. */
export const PRODUCT_CSV_COLUMNS = [
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
  "description",
] as const;

function cellValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Serialize records to CSV text without a BOM.
 * Downloads add the BOM with `excelCsvBytes` so Excel does not guess ANSI.
 */
export function recordsToCsv(
  records: Record<string, unknown>[],
  columns?: readonly string[],
): string {
  const cols = columns
    ? [...columns]
    : [...new Set(records.flatMap((record) => Object.keys(record)))];
  if (cols.length === 0) return "";
  if (!columns && records.length === 0) return "";

  const lines = [cols.join(",")];
  for (const record of records) {
    lines.push(cols.map((column) => csvEscape(cellValue(record[column]))).join(","));
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Product sheet only. Account, order, and tournament tables stay out of this
 * download — those belong to other admin flows and are not part of the Excel
 * Traditional Chinese fix.
 */
export async function exportProductCsv(): Promise<string> {
  if (!isDatabaseConfigured()) {
    throw new Error("請先設定 DATABASE_URL");
  }

  const products = await getPrisma().product.findMany({
    include: { variants: { orderBy: { price: "asc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  const records = products.map((product) => {
    const variant = product.variants[0];
    return {
      name: product.name,
      type: product.type,
      setCode: product.setCode ?? "",
      rarityTier: product.rarityTier ?? "",
      cardNumber: product.cardNumber ?? "",
      cardSet: product.cardSet ?? "",
      rarity: product.rarity ?? "",
      cardCategory: product.cardCategory ?? "",
      pokemonType: product.pokemonType ?? "",
      condition: variant?.condition ?? "",
      isFoil: variant ? String(variant.isFoil) : "",
      price: variant ? String(variant.price) : "",
      stock: variant ? String(variant.stock) : "",
      description: product.description ?? "",
    };
  });

  return recordsToCsv(records, PRODUCT_CSV_COLUMNS);
}

/** ZIP entry bytes, not a JS string, so the UTF-8 BOM is stored unchanged. */
export async function zipCsvFiles(
  files: Record<string, string>,
): Promise<Uint8Array<ArrayBuffer>> {
  const zip = new JSZip();
  for (const [name, csv] of Object.entries(files)) {
    if (!csv) continue;
    zip.file(`${name}.csv`, excelCsvBytes(csv));
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Uint8Array(buffer);
}
