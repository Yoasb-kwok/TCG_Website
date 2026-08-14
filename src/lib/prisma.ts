import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  /** Bump when schema changes so dev HMR does not keep a stale client */
  prismaSchemaVersion: string | undefined;
};

/** Increment after Prisma schema migrations that add/change model fields */
const PRISMA_SCHEMA_VERSION = "20260816000000_coupon";

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set");
  }

  const stale = globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION;

  if (!globalForPrisma.prisma || stale) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return globalForPrisma.prisma;
}
