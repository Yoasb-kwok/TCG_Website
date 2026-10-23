import type { ProductWithVariants } from "@/lib/types";

const GENERIC_DEMO_IDS = new Set(["demo-1", "demo-2", "demo-3", "demo-4", "demo-5", "demo-6"]);

/** Listing cards from Figma 9:16, used when the shop is still on the built-in demo catalog. */
export const CATALOG_FRAME_PRODUCTS: ProductWithVariants[] = [
  {
    id: "frame-charizard-sold-out",
    name: "噴火龍ex SAR（已售罄）",
    slug: "demo-charizard-sold-out",
    description: "用來試「淨係有貨」。取消勾選後才會出現。",
    type: "SINGLE",
    cardSet: "Scarlet & Violet—151",
    cardNumber: "201/165",
    rarity: "SAR · OTHER",
    pokemonType: "Fire",
    language: "zh-HK",
    images: [{ id: "frame-img-charizard-sold", url: "/brand/home/charizard-ex.png", alt: "噴火龍ex SAR" }],
    variants: [
      {
        id: "frame-var-charizard-sold",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 2680,
        stock: 0,
        sku: "DEMO-CHARIZARD-SOLDOUT",
      },
    ],
  },
  {
    id: "frame-sleeves",
    name: "霧面卡套 100 入",
    slug: "demo-sleeves",
    description: "黑色霧面卡套，一包 100 張",
    type: "ACCESSORY",
    cardSet: null,
    cardNumber: null,
    rarity: "OTHER · OTHER",
    pokemonType: null,
    language: "zh-HK",
    images: [{ id: "frame-img-sleeves", url: "/brand/home/scarlet-violet-151.png", alt: "霧面卡套 100 入" }],
    variants: [
      {
        id: "frame-var-sleeves",
        condition: "New",
        isFoil: false,
        price: 68,
        stock: 40,
        sku: "DEMO-SLEEVES-100",
      },
    ],
  },
  {
    id: "frame-umbreon",
    name: "Umbreon VMAX",
    slug: "umbreon-vmax-evolving",
    description:
      "A powerful Darkness-type Pokémon that lurks in the night. This Alternate Art Secret Rare from the Evolving Skies set is highly sought after by collectors.",
    type: "SINGLE",
    cardSet: "Evolving Skies",
    cardNumber: "215/203",
    rarity: "SR · OTHER",
    pokemonType: "Darkness",
    language: "en",
    images: [{ id: "frame-img-umbreon", url: "/brand/home/umbreon-vmax.png", alt: "Umbreon VMAX" }],
    variants: [
      {
        id: "frame-var-umbreon",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 3200,
        stock: 1,
        sku: "EVS-215-NM",
      },
    ],
  },
  {
    id: "frame-etb",
    name: "Scarlet & Violet—151 精英訓練家禮盒",
    slug: "sv151-etb",
    description: "ETB 封盒，含補充包及配件",
    type: "SEALED_BOX",
    cardSet: "Scarlet & Violet—151",
    cardNumber: null,
    rarity: "SUPPORTER · OTHER",
    pokemonType: null,
    language: "zh-HK",
    images: [
      {
        id: "frame-img-etb",
        url: "/brand/home/scarlet-violet-151.png",
        alt: "Scarlet & Violet—151 精英訓練家禮盒",
      },
    ],
    variants: [
      {
        id: "frame-var-etb",
        condition: "Sealed",
        isFoil: false,
        price: 480,
        stock: 15,
        sku: "SV151-ETB",
      },
    ],
  },
  {
    id: "frame-booster",
    name: "Scarlet & Violet—151 補充包",
    slug: "sv151-booster",
    description: "繁體中文版補充包",
    type: "BOOSTER_PACK",
    cardSet: "Scarlet & Violet—151",
    cardNumber: null,
    rarity: "OTHER · OTHER",
    pokemonType: null,
    language: "zh-HK",
    images: [
      {
        id: "frame-img-booster",
        url: "/brand/home/scarlet-violet-151.png",
        alt: "Scarlet & Violet—151 補充包",
      },
    ],
    variants: [
      {
        id: "frame-var-booster",
        condition: "Sealed",
        isFoil: false,
        price: 55,
        stock: 200,
        sku: "SV151-BOOSTER",
      },
    ],
  },
  {
    id: "frame-pikachu",
    name: "Pikachu",
    slug: "pikachu-151",
    description: "Scarlet & Violet—151",
    type: "SINGLE",
    cardSet: "Scarlet & Violet—151",
    cardNumber: "025/165",
    rarity: "R · OTHER",
    pokemonType: "Lightning",
    language: "zh-HK",
    images: [{ id: "frame-img-pikachu", url: "/brand/home/pikachu-151.png", alt: "Pikachu" }],
    variants: [
      {
        id: "frame-var-pikachu",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 15,
        stock: 50,
        sku: "SV151-025-NM",
      },
    ],
  },
  {
    id: "frame-mew",
    name: "Mew ex",
    slug: "mew-ex-151",
    description: "Scarlet & Violet—151",
    type: "SINGLE",
    cardSet: "Scarlet & Violet—151",
    cardNumber: "193/165",
    rarity: "SR · OTHER",
    pokemonType: "Psychic",
    language: "zh-HK",
    images: [{ id: "frame-img-mew", url: "/brand/home/mew-ex-151.png", alt: "Mew ex" }],
    variants: [
      {
        id: "frame-var-mew",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 180,
        stock: 12,
        sku: "SV151-193-NM",
      },
    ],
  },
  {
    id: "frame-charizard",
    name: "Charizard ex",
    slug: "charizard-ex-151",
    description: "Scarlet & Violet—151",
    type: "SINGLE",
    cardSet: "Scarlet & Violet—151",
    cardNumber: "199/165",
    rarity: "SAR · OTHER",
    pokemonType: "Fire",
    language: "zh-HK",
    images: [{ id: "frame-img-charizard", url: "/brand/home/charizard-ex.png", alt: "Charizard ex" }],
    variants: [
      {
        id: "frame-var-charizard",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 980,
        stock: 3,
        sku: "SV151-199-NM",
      },
    ],
  },
];

export function isGenericDemoCatalog(products: { id: string }[]): boolean {
  return products.length > 0 && products.every((product) => GENERIC_DEMO_IDS.has(product.id));
}

const FRAME_SLUG_ALIASES: Record<string, string> = {
  "demo-umbreon-vmax-evolving": "umbreon-vmax-evolving",
  "demo-sv151-etb": "sv151-etb",
  "demo-sv151-booster": "sv151-booster",
  "demo-pikachu-151": "pikachu-151",
  "demo-mew-ex-151": "mew-ex-151",
  "demo-charizard-ex-151": "charizard-ex-151",
};

export function catalogFrameProduct(slug: string): ProductWithVariants | undefined {
  const canonical = FRAME_SLUG_ALIASES[slug] ?? slug;
  return CATALOG_FRAME_PRODUCTS.find((product) => product.slug === canonical);
}
