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

const SAMPLE_NOTES: Record<string, string> = {
  m6: "官方樣本：香港 asia.pokemon-card.com「綠寶石風暴」(M6)。日文名稱與稀有度來自 pokemon-card.com。傳說競技場卡的港日收集編號可能不同，目錄以香港官方編號為準。",
  m6a: "官方樣本：香港 asia.pokemon-card.com 擴充包「30th CELEBRATION」(M6a)，發售日 2026-09-16。日文名稱與稀有度來自 pokemon-card.com 商品 pg=961（拡張パック 30th CELEBRATION）。不是「綠寶石風暴」。",
};

function catalogSampleFiles(): string[] {
  if (process.env.CATALOG_CSV) return [process.env.CATALOG_CSV];
  const dir = path.join(process.cwd(), "prisma/catalog/samples");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".csv") && name !== "template.csv")
    .sort()
    .map((name) => path.join(dir, name));
}

function noteFor(file: string): string {
  const key = path.basename(file, ".csv").toLowerCase();
  return SAMPLE_NOTES[key] ?? `官方樣本：${path.basename(file)}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("請先設定 DATABASE_URL");
  }

  const files = catalogSampleFiles();
  if (files.length === 0) {
    throw new Error("找不到卡表 CSV。請先產生 prisma/catalog/samples/m6.csv 或 m6a.csv。");
  }

  for (const file of files) {
    const csv = fs.readFileSync(file, "utf8");
    const result = await importCatalogCsv(prisma, csv, { note: noteFor(file) });
    console.log(`# ${path.basename(file)}`);
    for (const set of result.sets) {
      console.log(`✓ ${set.note}`);
    }
    for (const warning of result.warnings) {
      console.log(`! ${warning}`);
    }
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
