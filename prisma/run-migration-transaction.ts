/**
 * Run the transaction_table migration manually.
 * Usage: npx tsx prisma/run-migration-transaction.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "migrations", "20260812120000_transaction_table", "migration.sql");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = readFileSync(migrationPath, "utf-8");

  console.log("Running transaction_table migration...");
  console.log(`SQL file: ${migrationPath}`);

  try {
    await pool.query(sql);
    console.log("✅ Migration completed successfully");

    // Verify table exists
    const result = await pool.query('SELECT COUNT(*) FROM "Transaction"');
    console.log(`Transaction table row count: ${result.rows[0].count}`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
