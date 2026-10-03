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
      "./migrations/20260816000000_coupon/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  console.log("Running Coupon migration...");
  await pool.query(sql);
  console.log("✓ Coupon table created");

  // Verify Coupon table
  const result = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Coupon' ORDER BY ordinal_position`,
  );
  console.log(
    "Coupon columns:",
    result.rows.map((r) => `${r.column_name}(${r.data_type})`).join(", "),
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
