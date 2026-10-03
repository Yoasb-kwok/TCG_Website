import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const sql = readFileSync(
    new URL("./migrations/20260817120000_paidat/migration.sql", import.meta.url),
    "utf8",
  );

  console.log("Running paidAt migration...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✓ Transaction.paidAt added + backfilled");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Verify column
  const result = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'paidAt'`,
  );
  if (result.rows.length === 0) {
    throw new Error("paidAt column not found after migration");
  }
  console.log(
    "paidAt column:",
    result.rows.map((r) => `${r.column_name}(${r.data_type})`).join(", "),
  );

  // Verify backfill count
  const backfill = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE "paidAt" IS NOT NULL)::int AS with_paid_at
     FROM "Transaction"
     WHERE "status" IN ('PAID', 'SHIPPED', 'COMPLETED', 'NOT_REQUIRED')`,
  );
  console.log(
    `Backfill check: ${backfill.rows[0].with_paid_at}/${backfill.rows[0].total} money-status rows have paidAt`,
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
