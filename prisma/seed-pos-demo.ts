/**
 * 收銀示範資料：貨品、銷售和開支都寫入資料庫。
 * 重跑會更新同一批 demo- 貨品和單據，不會刪掉你自己開過的單。
 * 用法：npm run db:seed-pos-demo
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_PRODUCTS } from "../src/lib/demo-products";
import type { Expense, Sale } from "../src/lib/pos-shared";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type DemoProduct = (typeof DEMO_PRODUCTS)[number];

const EXTRA_PRODUCTS: DemoProduct[] = [
  {
    id: "demo-sleeves",
    name: "霧面卡套 100 入",
    slug: "demo-sleeves",
    description: "黑色霧面卡套，一包 100 張",
    type: "ACCESSORY",
    cardSet: null,
    cardNumber: null,
    rarity: null,
    pokemonType: null,
    language: "zh-HK",
    images: [{ id: "img-sleeves", url: "https://images.pokemontcg.io/sv3pt5/logo.png", alt: "卡套" }],
    variants: [
      {
        id: "var-sleeves",
        condition: "New",
        isFoil: false,
        price: 68,
        stock: 40,
        sku: "DEMO-SLEEVES-100",
        barcode: "4890000000100",
      },
    ],
  },
  {
    id: "demo-sold-out",
    name: "噴火龍ex SAR（已售罄）",
    slug: "demo-charizard-sold-out",
    description: "用來試「淨係有貨」。取消勾選後才會出現。",
    type: "SINGLE",
    cardSet: "Scarlet & Violet—151",
    cardNumber: "201/165",
    rarity: "Special Art Rare",
    pokemonType: "Fire",
    language: "zh-HK",
    images: [
      {
        id: "img-sold-out",
        url: "https://images.pokemontcg.io/sv3pt5/199_hires.png",
        alt: "噴火龍ex",
      },
    ],
    variants: [
      {
        id: "var-sold-out",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 2680,
        stock: 0,
        sku: "DEMO-CHARIZARD-SOLDOUT",
      },
    ],
  },
];

function daysAgo(days: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 20, 0, 0);
  return date.toISOString();
}

function sale(input: Omit<Sale, "note" | "voided" | "discount"> & { note?: string; voided?: boolean; discount?: number }): Sale {
  return { note: "", voided: false, discount: 0, ...input };
}

function item(
  id: string,
  name: string,
  sku: string,
  quantity: number,
  unitPrice: number,
  unitCost: number,
): Sale["items"][number] {
  return { id, name, sku, quantity, unitPrice, unitCost };
}

function demoLedger(): { sales: Sale[]; expenses: Expense[] } {
  return {
    sales: [
      sale({
        id: "demo-sale-today-cash",
        createdAt: daysAgo(0, 11),
        paymentMethod: "CASH",
        items: [item("demo-line-charizard", "Charizard ex", "SV151-199-NM", 1, 1280, 700)],
      }),
      sale({
        id: "demo-sale-today-payme",
        createdAt: daysAgo(0, 15),
        paymentMethod: "PAYME",
        discount: 20,
        note: "買四包減二十",
        items: [item("demo-line-booster", "Scarlet & Violet—151 補充包", "SV151-BOOSTER", 4, 55, 32)],
      }),
      sale({
        id: "demo-sale-today-void",
        createdAt: daysAgo(0, 16),
        paymentMethod: "FPS",
        voided: true,
        note: "入錯數，已作廢",
        items: [item("demo-line-void", "Pikachu", "SV151-025-NM", 2, 15, 4)],
      }),
      sale({
        id: "demo-sale-month-card",
        createdAt: daysAgo(4, 14),
        paymentMethod: "CARD",
        items: [
          item("demo-line-etb", "Scarlet & Violet—151 精英訓練家禮盒", "SV151-ETB", 1, 480, 300),
          item("demo-line-sleeves", "霧面卡套 100 入", "DEMO-SLEEVES-100", 2, 68, 28),
        ],
      }),
      sale({
        id: "demo-sale-month-cash",
        createdAt: daysAgo(6, 18),
        paymentMethod: "CASH",
        items: [item("demo-line-mew", "Mew ex", "SV151-193-NM", 2, 180, 90)],
      }),
      sale({
        id: "demo-sale-year",
        createdAt: daysAgo(24, 13),
        paymentMethod: "CASH",
        items: [item("demo-line-umbreon", "Umbreon VMAX", "EVS-215-NM", 1, 3200, 2100)],
      }),
    ],
    expenses: [
      { id: "demo-exp-rent", createdAt: daysAgo(4, 9), category: "RENT", amount: 28000, note: "本月舖租" },
      { id: "demo-exp-wages", createdAt: daysAgo(4, 9), category: "WAGES", amount: 8000, note: "兼職一週" },
      { id: "demo-exp-supplies", createdAt: daysAgo(0, 10), category: "SUPPLIES", amount: 450, note: "卡套同卡盒補貨" },
      { id: "demo-exp-utilities", createdAt: daysAgo(24, 9), category: "UTILITIES", amount: 1200, note: "上月水電" },
    ],
  };
}

async function upsertProducts() {
  const products = [...DEMO_PRODUCTS, ...EXTRA_PRODUCTS];
  for (const product of products) {
    const slug = product.slug.startsWith("demo-") ? product.slug : `demo-${product.slug}`;
    const saved = await prisma.product.upsert({
      where: { slug },
      create: {
        name: product.name,
        slug,
        description: product.description,
        type: product.type,
        cardSet: product.cardSet,
        cardNumber: product.cardNumber,
        rarity: product.rarity,
        pokemonType: product.pokemonType,
        language: product.language,
      },
      update: {
        name: product.name,
        description: product.description,
        type: product.type,
        cardSet: product.cardSet,
        cardNumber: product.cardNumber,
        rarity: product.rarity,
        pokemonType: product.pokemonType,
        language: product.language,
      },
    });

    await prisma.image.deleteMany({ where: { productId: saved.id } });
    if (product.images.length > 0) {
      await prisma.image.createMany({
        data: product.images.map((image, index) => ({
          productId: saved.id,
          url: image.url,
          alt: image.alt,
          sortOrder: index,
        })),
      });
    }

    for (const variant of product.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        create: {
          productId: saved.id,
          condition: variant.condition,
          isFoil: variant.isFoil,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
          barcode: variant.barcode ?? null,
        },
        update: {
          productId: saved.id,
          condition: variant.condition,
          isFoil: variant.isFoil,
          price: variant.price,
          stock: variant.stock,
          barcode: variant.barcode ?? null,
        },
      });
    }
    console.log(`✓ ${product.name}`);
  }
}

async function writeLedger() {
  const demo = demoLedger();
  for (const entry of demo.sales) {
    const items = entry.items.map((line, sortIndex) => ({
      id: line.id,
      name: line.name,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      unitCost: line.unitCost,
      sortIndex,
    }));
    await prisma.$transaction(async (tx) => {
      await tx.posSaleItem.deleteMany({ where: { saleId: entry.id } });
      await tx.posSale.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          createdAt: new Date(entry.createdAt),
          paymentMethod: entry.paymentMethod,
          discount: entry.discount,
          note: entry.note,
          voided: entry.voided,
          items: { create: items },
        },
        update: {
          createdAt: new Date(entry.createdAt),
          paymentMethod: entry.paymentMethod,
          discount: entry.discount,
          note: entry.note,
          voided: entry.voided,
          items: { create: items },
        },
      });
    });
  }
  for (const expense of demo.expenses) {
    await prisma.posExpense.upsert({
      where: { id: expense.id },
      create: {
        id: expense.id,
        createdAt: new Date(expense.createdAt),
        category: expense.category,
        amount: expense.amount,
        note: expense.note,
      },
      update: {
        createdAt: new Date(expense.createdAt),
        category: expense.category,
        amount: expense.amount,
        note: expense.note,
      },
    });
  }
  console.log(`✓ 收銀單據 ${demo.sales.length} 張，開支 ${demo.expenses.length} 筆`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("請先在 .env 設定 DATABASE_URL");
  }
  await upsertProducts();
  await writeLedger();
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
