/**
 * Insert the fixed weekly demo tournaments (standard-sat-12, beginner-friendly).
 * Safe to re-run against a local or dev database: an existing slug is skipped.
 *
 * Refuses production before opening a database connection. Signals include
 * VERCEL_ENV=production, an app URL on the live storefront, live Stripe keys,
 * and NODE_ENV=production pointed at a remote database. There is no runtime
 * path that inserts these rows; this script is the only writer.
 *
 *   npm run db:seed-tournaments
 */
import "dotenv/config";
import { assertDemoTournamentSeedAllowed } from "../src/lib/demo-tournament-guard";
import { seedMissingTournaments } from "../src/lib/tournament-seed";

async function main() {
  assertDemoTournamentSeedAllowed();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("請在環境變數設定 DATABASE_URL");
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma/client");

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const { created, skipped } = await seedMissingTournaments({
      findBySlug: async (slug) => prisma.tournament.findUnique({ where: { slug }, select: { slug: true } }),
      create: async (row) => {
        await prisma.tournament.create({ data: row });
      },
    });

    if (created.length > 0) console.log(`已建立賽事：${created.join(", ")}`);
    if (skipped.length > 0) console.log(`已存在，略過：${skipped.join(", ")}`);
    if (created.length === 0 && skipped.length === 0) console.log("沒有可建立的賽事");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
