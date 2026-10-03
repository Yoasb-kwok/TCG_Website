import { stringify } from "csv-stringify/sync";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** 將 Prisma record 的值轉為 CSV 安全字串 */
function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value;
  return value;
}

/** 將一組 record 物件序列化為 CSV 字串 */
function recordsToCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "";

  const columns = [...new Set(records.flatMap((r) => Object.keys(r)))];

  const processed = records.map((r) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col] = serializeValue(r[col]);
    }
    return row;
  });

  return stringify(processed, { header: true, columns });
}

export async function exportAllTables(): Promise<Record<string, string>> {
  if (!isDatabaseConfigured()) {
    throw new Error("請先設定 DATABASE_URL");
  }

  const prisma = getPrisma();

  const [
    taxonomyOptions,
    users,
    products,
    productVariants,
    homeBanners,
    homeFeaturedProducts,
    aboutPageContent,
    orders,
    orderItems,
    tournaments,
    tournamentRegistrations,
  ] = await Promise.all([
    prisma.taxonomyOption.findMany(),
    prisma.user.findMany(),
    prisma.product.findMany(),
    prisma.productVariant.findMany(),
    prisma.homeBanner.findMany(),
    prisma.homeFeaturedProduct.findMany(),
    prisma.aboutPageContent.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.tournament.findMany(),
    prisma.tournamentRegistration.findMany(),
  ]);

  return {
    taxonomyOption: recordsToCsv(taxonomyOptions as Record<string, unknown>[]),
    user: recordsToCsv(users as Record<string, unknown>[]),
    product: recordsToCsv(products as Record<string, unknown>[]),
    productVariant: recordsToCsv(productVariants as Record<string, unknown>[]),
    homeBanner: recordsToCsv(homeBanners as Record<string, unknown>[]),
    homeFeaturedProduct: recordsToCsv(
      homeFeaturedProducts as Record<string, unknown>[],
    ),
    aboutPageContent: recordsToCsv(
      aboutPageContent as Record<string, unknown>[],
    ),
    order: recordsToCsv(orders as Record<string, unknown>[]),
    orderItem: recordsToCsv(orderItems as Record<string, unknown>[]),
    tournament: recordsToCsv(tournaments as Record<string, unknown>[]),
    tournamentRegistration: recordsToCsv(
      tournamentRegistrations as Record<string, unknown>[],
    ),
  };
}
