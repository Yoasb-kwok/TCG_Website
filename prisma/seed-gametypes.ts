/**
 * Seed the three game types (ADR-006) + default shared taxonomy options.
 * Idempotent: upserts by slug / skips when taxonomy table already has rows.
 *
 * Run: DATABASE_URL=<url> npx tsx prisma/seed-gametypes.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ensureDefaultTaxonomy } from "../src/lib/taxonomy-db";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const GAME_TYPES = [
  // Pokémon keeps the fixed id used by migrations + admin-products fallback
  { id: "00000000-0000-0000-0000-000000000001", name: "Pokémon", slug: "pokemon", sortOrder: 0 },
  { name: "One Piece Card Game", slug: "one-piece", sortOrder: 1 },
  { name: "Disney Lorcana", slug: "disney-lorcana", sortOrder: 2 },
];

async function main() {
  for (const g of GAME_TYPES) {
    await prisma.gameType.upsert({
      where: { slug: g.slug },
      create: g,
      update: { name: g.name, sortOrder: g.sortOrder, isActive: true },
    });
    console.log(`✓ 遊戲類型 ${g.name}（${g.slug}）`);
  }

  await ensureDefaultTaxonomy();
  console.log("✓ 預設標籤已就緒");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
