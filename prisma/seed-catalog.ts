import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { importCatalogCsv } from "../src/lib/catalog-import";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("請先設定 DATABASE_URL");
  }

  const file =
    process.env.CATALOG_CSV ??
    path.join(process.cwd(), "prisma/catalog/samples/m6.csv");
  const csv = fs.readFileSync(file, "utf8");
  const result = await importCatalogCsv(prisma, csv, {
    note: "官方樣本：香港 asia.pokemon-card.com「綠寶石風暴」(M6)。日文名稱與稀有度來自 pokemon-card.com。傳說競技場卡的港日收集編號可能不同，目錄以香港官方編號為準。",
  });

  for (const set of result.sets) {
    console.log(`✓ ${set.note}`);
  }
  for (const warning of result.warnings) {
    console.log(`! ${warning}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
