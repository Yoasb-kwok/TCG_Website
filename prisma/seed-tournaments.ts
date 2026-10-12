/**
 * Insert the fixed weekly demo tournaments (standard-sat-12, beginner-friendly).
 * Safe to re-run: a slug that already exists is skipped, so admin edits are kept.
 *
 * Requires DATABASE_URL (the same connection used for migrations). No other secrets.
 *   npm run db:seed-tournaments
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedMissingTournaments } from "../src/lib/tournament-seed";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("請在環境變數設定 DATABASE_URL");
  }

  const { created, skipped } = await seedMissingTournaments({
    findBySlug: async (slug) => prisma.tournament.findUnique({ where: { slug }, select: { slug: true } }),
    create: async (row) => {
      await prisma.tournament.create({ data: row });
    },
  });

  if (created.length > 0) console.log(`已建立賽事：${created.join(", ")}`);
  if (skipped.length > 0) console.log(`已存在，略過：${skipped.join(", ")}`);
  if (created.length === 0 && skipped.length === 0) console.log("沒有可建立的賽事");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
