import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const sql = readFileSync(
    new URL(
      "./migrations/20260814120000_inventory_stocking/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  console.log("Running Inventory Stocking migration...");
  await pool.query(sql);
  console.log("✓ ProductVariant columns + StockRecord + ShopSetting created");

  // Verify ProductVariant columns
  const variantCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'ProductVariant' AND column_name IN ('bookedStock', 'reservedStock', 'reservedNote', 'lowThreshold', 'criticalThreshold')`,
  );
  console.log("New ProductVariant columns:", variantCols.rows.map((r) => r.column_name).join(", "));

  // Verify StockRecord table
  const recordCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'StockRecord' ORDER BY ordinal_position`,
  );
  console.log("StockRecord columns:", recordCols.rows.map((r) => r.column_name).join(", "));

  // Verify ShopSetting
  const settingCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'ShopSetting' ORDER BY ordinal_position`,
  );
  console.log("ShopSetting columns:", settingCols.rows.map((r) => r.column_name).join(", "));

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
