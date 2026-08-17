/**
 * ADR-003 Sub-task 10: Backfill existing Orders + TournamentRegistrations into Transaction table.
 *
 * Usage: npx tsx scripts/backfill-transactions.ts
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 * The domain service checks for existing Transaction records before creating.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  createOrderTransaction,
  createTournamentTransaction,
} from "../src/lib/transactions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Backfill: Orders → Transactions ===");

  // Find all orders that represent successful payments
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
    },
    select: { id: true, email: true, status: true, totalAmount: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${orders.length} paid orders to backfill`);

  let orderCount = 0;
  for (const order of orders) {
    try {
      await createOrderTransaction(order.id);
      orderCount++;
    } catch (err) {
      console.error(`  ❌ Order ${order.id}:`, err);
    }
  }
  console.log(`✅ Backfilled ${orderCount} order transactions`);

  console.log("\n=== Backfill: TournamentRegistrations → Transactions ===");

  // Find all paid tournament registrations
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { paymentStatus: "PAID" },
    select: { id: true, email: true, paymentStatus: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${registrations.length} paid registrations to backfill`);

  let regCount = 0;
  for (const reg of registrations) {
    try {
      await createTournamentTransaction(reg.id);
      regCount++;
    } catch (err) {
      console.error(`  ❌ Registration ${reg.id}:`, err);
    }
  }
  console.log(`✅ Backfilled ${regCount} tournament transactions`);

  // Summary
  const total = await prisma.transaction.count();
  console.log(`\n=== Summary ===`);
  console.log(`Total Transaction rows: ${total}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => pool.end());
