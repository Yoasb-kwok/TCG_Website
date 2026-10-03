/**
 * Demo product seed — uses static demo images under public/demo-images/.
 * Pokémon (11 singles) + One Piece OP16 (10 singles), per the folder split
 * in `tcg demo pic/`. Names are placeholders (admin can rename in dashboard).
 *
 * Also adds game-scoped taxonomy for One Piece (OP16 set + SEC/UC/C rarities)
 * per ADR-006 — shared values (SR, R, OTHER…) already exist.
 *
 * Idempotent: skips products whose slug already exists.
 * Run: DATABASE_URL=<url> npx tsx prisma/seed-products.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RARITY_SORT: Record<string, number> = {
  MUR: 0, SAR: 1, SR: 2, AR: 3, RR: 4, R_SHINY: 5, R: 6, C: 7, UC: 8, SEC: 9,
};
const RARITY_LABEL: Record<string, string> = {
  SAR: "SAR", SR: "SR", AR: "AR", RR: "RR", R: "R",
  C: "C（普通）", UC: "UC（非普通）", SEC: "SEC（紅閃）",
};

type DemoProduct = {
  slug: string;
  name: string;
  description: string;
  type: "SINGLE";
  cardSet: string;
  cardNumber: string | null;
  rarity: string;
  rarityTier: string;
  cardCategory: string;
  pokemonType: string | null;
  language: string;
  setCode: string;
  setSortIndex: number;
  gameSlug: string;
  image: string;
  price: number;
  stock: number;
  isFoil?: boolean;
};

const PTCG: DemoProduct[] = [
  {
    slug: "demo-charizard-ex-sv35-199",
    name: "噴火龍 ex（Charizard ex）199/165",
    description: "Scarlet & Violet—151 特別插畫稀有（SAR），英文版。",
    type: "SINGLE", cardSet: "Scarlet & Violet—151", cardNumber: "199/165",
    rarity: "Special Illustration Rare", rarityTier: "SAR",
    cardCategory: "POKEMON", pokemonType: "火", language: "en",
    setCode: "SV3", setSortIndex: 15, gameSlug: "pokemon",
    image: "/demo-images/ptcg/SV3pt5_EN_199-2x.png",
    price: 1280, stock: 2,
  },
  {
    slug: "demo-ptcg-tw00008323",
    name: "噴火龍（繁中）",
    description: "繁體中文版單卡，近全新狀態。",
    type: "SINGLE", cardSet: "M3", cardNumber: "083/101",
    rarity: "SAR", rarityTier: "SAR",
    cardCategory: "POKEMON", pokemonType: "火", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00008323.png",
    price: 368, stock: 3,
  },
  {
    slug: "demo-ptcg-tw00008324",
    name: "皮卡丘（繁中）",
    description: "繁體中文版單卡，人氣角色。",
    type: "SINGLE", cardSet: "M3", cardNumber: "084/101",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: "雷", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00008324.png",
    price: 25, stock: 30,
  },
  {
    slug: "demo-ptcg-tw00014196",
    name: "超夢夢（繁中）",
    description: "繁體中文版單卡，經典人氣卡。",
    type: "SINGLE", cardSet: "M3", cardNumber: "141/101",
    rarity: "SR", rarityTier: "SR",
    cardCategory: "POKEMON", pokemonType: "超", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00014196.png",
    price: 188, stock: 8,
  },
  {
    slug: "demo-ptcg-tw00019328",
    name: "路卡利歐（繁中）",
    description: "繁體中文版單卡。",
    type: "SINGLE", cardSet: "M3", cardNumber: "193/101",
    rarity: "RR", rarityTier: "RR",
    cardCategory: "POKEMON", pokemonType: "鬥", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019328.png",
    price: 48, stock: 12,
  },
  {
    slug: "demo-ptcg-tw00019551",
    name: "伊布（繁中）",
    description: "繁體中文版單卡。",
    type: "SINGLE", cardSet: "M3", cardNumber: "195/101",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: "無", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019551.png",
    price: 18, stock: 20,
  },
  {
    slug: "demo-ptcg-tw00019560",
    name: "月亮伊布（繁中）",
    description: "繁體中文版單卡，收藏熱門。",
    type: "SINGLE", cardSet: "M3", cardNumber: "196/101",
    rarity: "AR", rarityTier: "AR",
    cardCategory: "POKEMON", pokemonType: "惡", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019560.png",
    price: 98, stock: 5,
  },
  {
    slug: "demo-ptcg-tw00019565",
    name: "太陽伊布（繁中）",
    description: "繁體中文版單卡。",
    type: "SINGLE", cardSet: "M3", cardNumber: "197/101",
    rarity: "RR", rarityTier: "RR",
    cardCategory: "POKEMON", pokemonType: "超", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019565.png",
    price: 42, stock: 14,
  },
  {
    slug: "demo-ptcg-tw00019568",
    name: "甲賀忍蛙（繁中）",
    description: "繁體中文版單卡。",
    type: "SINGLE", cardSet: "M3", cardNumber: "198/101",
    rarity: "SAR", rarityTier: "SAR",
    cardCategory: "POKEMON", pokemonType: "水", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019568.png",
    price: 328, stock: 2,
  },
  {
    slug: "demo-ptcg-tw00019581",
    name: "妙蛙種子（繁中）",
    description: "繁體中文版單卡，新手入門首選。",
    type: "SINGLE", cardSet: "M3", cardNumber: "199/101",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: "草", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019581.png",
    price: 15, stock: 25,
  },
  {
    slug: "demo-ptcg-tw00019608",
    name: "傑尼龜（繁中）",
    description: "繁體中文版單卡。",
    type: "SINGLE", cardSet: "M3", cardNumber: "196/101",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: "水", language: "zh-HK",
    setCode: "M3", setSortIndex: 0, gameSlug: "pokemon",
    image: "/demo-images/ptcg/tw00019608.png",
    price: 15, stock: 25,
  },
];

const ONEPIECE: DemoProduct[] = [
  {
    slug: "demo-op16-001",
    name: "蒙其·D·魯夫（OP16-001）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "001/…",
    rarity: "C", rarityTier: "C",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-001.png",
    price: 6, stock: 20,
  },
  {
    slug: "demo-op16-015",
    name: "羅羅亞·索隆（OP16-015）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "015/…",
    rarity: "UC", rarityTier: "UC",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-015_p1.png",
    price: 9, stock: 18,
  },
  {
    slug: "demo-op16-026",
    name: "娜美（OP16-026）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "026/…",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-026_p1.png",
    price: 22, stock: 12,
  },
  {
    slug: "demo-op16-032",
    name: "香吉士（OP16-032）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "032/…",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-032_p1.png",
    price: 22, stock: 15,
  },
  {
    slug: "demo-op16-042",
    name: "多尼多尼·喬巴（OP16-042）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "042/…",
    rarity: "UC", rarityTier: "UC",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-042_p1.png",
    price: 9, stock: 22,
  },
  {
    slug: "demo-op16-043",
    name: "妮可·羅賓（OP16-043）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "043/…",
    rarity: "R", rarityTier: "R",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-043.png",
    price: 25, stock: 10,
  },
  {
    slug: "demo-op16-055",
    name: "佛朗基（OP16-055）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "055/…",
    rarity: "C", rarityTier: "C",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-055_p1.png",
    price: 6, stock: 16,
  },
  {
    slug: "demo-op16-063",
    name: "布魯克（OP16-063）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "063/…",
    rarity: "SR", rarityTier: "SR",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-063_p2.png",
    price: 98, stock: 6,
  },
  {
    slug: "demo-op16-073",
    name: "吉貝爾（OP16-073）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "073/…",
    rarity: "SR", rarityTier: "SR",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-073_p1.png",
    price: 88, stock: 4,
  },
  {
    slug: "demo-op16-074",
    name: "波雅·漢考克（OP16-074）",
    description: "ONE PIECE 卡片遊戲 OP16 單卡，紅閃稀有。",
    type: "SINGLE", cardSet: "OP16", cardNumber: "074/…",
    rarity: "SEC", rarityTier: "SEC",
    cardCategory: "POKEMON", pokemonType: null, language: "zh-HK",
    setCode: "OP16", setSortIndex: 50, gameSlug: "one-piece",
    image: "/demo-images/onepiece/OP16-074.png",
    price: 298, stock: 2,
  },
];

async function ensureOnePieceTaxonomy(onePieceId: string) {
  // Shared values (SR, R, OTHER) already exist; only add non-colliding ones,
  // scoped to one-piece (ADR-006). Unique is [kind, value, parentValue].
  const toAdd = [
    { kind: "SET_CODE" as const, value: "OP16", label: "OP16", sortIndex: 50 },
    { kind: "RARITY" as const, value: "SEC", label: RARITY_LABEL.SEC, sortIndex: 9 },
    { kind: "RARITY" as const, value: "UC", label: RARITY_LABEL.UC, sortIndex: 10 },
    { kind: "RARITY" as const, value: "C", label: RARITY_LABEL.C, sortIndex: 11 },
  ];
  for (const row of toAdd) {
    const existing = await prisma.taxonomyOption.findFirst({
      where: { kind: row.kind, value: row.value, parentValue: null },
    });
    if (existing) continue;
    await prisma.taxonomyOption.create({
      data: { ...row, parentValue: null, gameTypeId: onePieceId },
    });
    console.log(`✓ 標籤 ${row.kind}: ${row.label}（one-piece 專屬）`);
  }
}

async function main() {
  const pokemon = await prisma.gameType.findUnique({ where: { slug: "pokemon" } });
  const onePiece = await prisma.gameType.findUnique({ where: { slug: "one-piece" } });
  if (!pokemon || !onePiece) {
    throw new Error("請先執行 prisma/seed-gametypes.ts");
  }

  await ensureOnePieceTaxonomy(onePiece.id);

  const gameBySlug: Record<string, string> = {
    pokemon: pokemon.id,
    "one-piece": onePiece.id,
  };

  let created = 0;
  let skipped = 0;
  for (const p of [...PTCG, ...ONEPIECE]) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      skipped++;
      continue;
    }
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        type: p.type,
        cardSet: p.cardSet,
        cardNumber: p.cardNumber,
        rarity: p.rarity,
        rarityTier: p.rarityTier,
        cardCategory: p.cardCategory,
        pokemonType: p.pokemonType,
        language: p.language,
        setCode: p.setCode,
        setSortIndex: p.setSortIndex,
        raritySortIndex: RARITY_SORT[p.rarityTier] ?? 99,
        gameTypeId: gameBySlug[p.gameSlug],
        variants: {
          create: {
            condition: "Near Mint (NM)",
            isFoil: p.isFoil ?? false,
            price: p.price,
            stock: p.stock,
            sku: p.slug.toUpperCase().replace(/-/g, "_").slice(0, 40) + "_NM",
          },
        },
        images: {
          create: { url: p.image, alt: p.name, sortOrder: 0 },
        },
      },
    });
    created++;
    console.log(`✓ ${p.gameSlug === "pokemon" ? "PTCG" : "OP"} ${p.name}（$${p.price}，存貨 ${p.stock}）`);

    // featured: Charizard + Hancock SEC
    if (p.slug === "demo-charizard-ex-sv35-199" || p.slug === "demo-op16-074") {
      await prisma.homeFeaturedProduct.upsert({
        where: { productId: product.id },
        create: { productId: product.id, sortIndex: p.slug.startsWith("demo-op") ? 1 : 0 },
        update: {},
      });
    }
  }

  console.log(`\n✅ 示範商品完成：新增 ${created}、已存在略過 ${skipped}`);
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
