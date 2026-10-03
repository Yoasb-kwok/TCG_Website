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
      "./migrations/20260817000000_accounts/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  console.log("Running Accounts migration (EmailChangeRequest + User.deletedAt)...");
  await pool.query(sql);
  console.log("✓ EmailChangeRequest table + User.deletedAt applied");

  const table = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'EmailChangeRequest' ORDER BY ordinal_position`,
  );
  console.log(
    "EmailChangeRequest columns:",
    table.rows.map((r) => r.column_name).join(", "),
  );

  const column = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'deletedAt'`,
  );
  console.log(
    column.rows.length > 0
      ? "✓ User.deletedAt exists"
      : "✗ User.deletedAt MISSING",
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
