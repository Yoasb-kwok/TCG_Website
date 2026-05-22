import "dotenv/config";
import { hashPassword } from "../src/lib/auth-password";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@trtcg.hk";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("請在 .env 設定 ADMIN_PASSWORD");
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "商家管理員",
      role: "ADMIN",
      passwordHash,
    },
    update: {
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(`✓ ADMIN 帳戶：${admin.email} (role: ${admin.role})`);
  console.log("請使用此電郵於 /admin/login 登入（NextAuth）");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
