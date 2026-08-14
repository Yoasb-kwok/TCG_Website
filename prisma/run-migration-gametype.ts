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
      "./migrations/20260815000000_game_type/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  console.log("Running GameType migration...");
  await pool.query(sql);
  console.log("✓ GameType table created + Product/TaxonomyOption FKs added");

  // Verify GameType table
  const gameTypes = await pool.query(`SELECT id, name, slug FROM "GameType"`);
  console.log(
    "GameType rows:",
    gameTypes.rows.map((r) => `${r.name}(${r.slug})`).join(", "),
  );

  // Verify Product.gameTypeId
  const productCols = await pool.query(
    `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'gameTypeId'`,
  );
  console.log("Product.gameTypeId:", productCols.rows[0]);

  // Verify TaxonomyOption.gameTypeId
  const taxonomyCols = await pool.query(
    `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'TaxonomyOption' AND column_name = 'gameTypeId'`,
  );
  console.log("TaxonomyOption.gameTypeId:", taxonomyCols.rows[0]);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
