/**
 * 清空商品與訂單資料（保留使用者與賽事設定）
 * 執行：npm run db:clear
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const [orderItems, orders, images, variants, products] = await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.image.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
  ]);

  console.log("已清空：");
  console.log(`  訂單明細 ${orderItems.count}`);
  console.log(`  訂單 ${orders.count}`);
  console.log(`  圖片 ${images.count}`);
  console.log(`  規格 ${variants.count}`);
  console.log(`  商品 ${products.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
