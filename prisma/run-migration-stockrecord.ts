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
      "./migrations/20260814130000_stockrecord_denormalize/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  console.log("Running StockRecord denormalize migration...");
  await pool.query(sql);
  console.log("✓ StockRecord denormalized + variantId nullable + onDelete SetNull");

  // Verify new columns
  const cols = await pool.query(
    `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'StockRecord' ORDER BY ordinal_position`,
  );
  console.log(
    "StockRecord columns:",
    cols.rows.map((r) => `${r.column_name}(${r.is_nullable})`).join(", "),
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
