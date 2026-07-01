import "dotenv/config";
import type { Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { HERO_BANNERS } from "../src/lib/constants";
import { DEFAULT_ABOUT_CONTENT } from "../src/lib/site-content";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedBanners() {
  const count = await prisma.homeBanner.count();
  if (count > 0) {
    console.log(`✓ Banner 已有 ${count} 筆，略過`);
    return;
  }

  await prisma.homeBanner.createMany({
    data: HERO_BANNERS.map((banner, index) => ({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.image,
      href: banner.href,
      gradient: banner.gradient,
      active: true,
      sortIndex: index,
    })),
  });
  console.log(`✓ 已建立 ${HERO_BANNERS.length} 筆 Banner`);
}

async function seedFeatured() {
  const count = await prisma.homeFeaturedProduct.count();
  if (count > 0) {
    console.log(`✓ 熱門商品已有 ${count} 筆，略過`);
    return;
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, name: true },
  });

  if (!products.length) {
    console.log("⚠ 資料庫沒有商品，略過熱門商品種子");
    return;
  }

  await prisma.homeFeaturedProduct.createMany({
    data: products.map((product, index) => ({
      productId: product.id,
      sortIndex: index,
    })),
  });
  console.log(`✓ 已建立 ${products.length} 筆熱門商品：${products.map((p) => p.name).join("、")}`);
}

async function seedAbout() {
  const existing = await prisma.aboutPageContent.findUnique({
    where: { id: "default" },
  });
  if (existing) {
    console.log("✓ 關於我們已有內容，略過");
    return;
  }

  const sections = DEFAULT_ABOUT_CONTENT.sections as unknown as Prisma.InputJsonValue;

  await prisma.aboutPageContent.create({
    data: {
      id: "default",
      pageTitle: DEFAULT_ABOUT_CONTENT.pageTitle,
      pageSubtitle: DEFAULT_ABOUT_CONTENT.pageSubtitle,
      sections,
      storeAddressZh: DEFAULT_ABOUT_CONTENT.storeAddressZh,
      storeAddressEn: DEFAULT_ABOUT_CONTENT.storeAddressEn,
      storeHours: DEFAULT_ABOUT_CONTENT.storeHours,
      storeMtr: DEFAULT_ABOUT_CONTENT.storeMtr,
      mapEmbedUrl: DEFAULT_ABOUT_CONTENT.mapEmbedUrl,
      contactBody: DEFAULT_ABOUT_CONTENT.contactBody,
      showStoreInfo: DEFAULT_ABOUT_CONTENT.showStoreInfo,
    },
  });
  console.log("✓ 已建立關於我們預設內容");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("請在 .env 設定 DATABASE_URL");
  }

  await seedBanners();
  await seedFeatured();
  await seedAbout();
  console.log("網站內容種子完成");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
