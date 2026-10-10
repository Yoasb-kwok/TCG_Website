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
  m1l: "官方樣本：香港 asia.pokemon-card.com 擴充包「超級勇氣」(M1L)，發售日 2025-08-15。日文名稱與稀有度來自 pokemon-card.com 商品 pg=944（拡張パック「メガブレイブ」）。香港官方沒有 M1 或 M1a。",
  m1s: "官方樣本：香港 asia.pokemon-card.com 擴充包「超級交響樂」(M1S)，發售日 2025-08-15。日文名稱與稀有度來自 pokemon-card.com 商品 pg=945（拡張パック「メガシンフォニア」）。",
  m2: "官方樣本：香港 asia.pokemon-card.com 擴充包「烈獄狂火X」(M2)，發售日 2025-10-09。日文名稱與稀有度來自 pokemon-card.com 商品 pg=949（拡張パック「インフェルノX」）。",
  m2a: "官方樣本：香港 asia.pokemon-card.com 高級擴充包「超級進化夢想ex」(M2a)，發售日 2025-12-05。日文名稱與稀有度來自 pokemon-card.com 商品 pg=950（ハイクラスパック「MEGAドリームex」）。香港搜尋會把部分收集編號列成多頁，目錄每個編號只留一列。",
  m3: "官方樣本：香港 asia.pokemon-card.com 擴充包「虛無歸零」(M3)，發售日 2026-02-06。日文名稱與稀有度來自 pokemon-card.com 商品 pg=952（拡張パック「ムニキスゼロ」）。",
  m4: "官方樣本：香港 asia.pokemon-card.com 擴充包「忍者飛旋」(M4)，發售日 2026-03-27。日文名稱與稀有度來自 pokemon-card.com 商品 pg=953（拡張パック「ニンジャスピナー」）。",
  m5: "官方樣本：香港 asia.pokemon-card.com 擴充包「深淵之瞳」(M5)，發售日 2026-06-05。日文名稱與稀有度來自 pokemon-card.com 商品 pg=954（拡張パック「アビスアイ」）。",
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
    throw new Error("找不到卡表 CSV。請先產生 prisma/catalog/samples 裡的官方樣本，例如 m5.csv、m6.csv。");
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
