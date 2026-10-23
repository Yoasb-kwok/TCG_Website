import type { ProductWithVariants } from "@/lib/types";

/**
 * Homepage cards from the Figma frame, used only when the store has no CMS
 * featured selection and is still on the built-in demo quartet.
 */
export const HOME_SHOWCASE_PRODUCTS: ProductWithVariants[] = [
  {
    id: "home-charizard-sold-out",
    name: "噴火龍ex SAR（已售罄）",
    slug: "demo-charizard-sold-out",
    description: "Scarlet & Violet—151 特別繪製卡，示範已售罄。",
    type: "SINGLE",
    cardSet: "Scarlet & Violet—151",
    cardNumber: "201/165",
    rarity: "Special Art Rare",
    pokemonType: "Fire",
    language: "zh-HK",
    images: [
      {
        id: "home-img-charizard",
        url: "/brand/home/charizard-ex.png",
        alt: "噴火龍ex SAR",
      },
    ],
    variants: [
      {
        id: "home-var-charizard",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 2680,
        stock: 0,
        sku: "DEMO-CHARIZARD-SOLDOUT",
      },
    ],
  },
  {
    id: "home-sleeves",
    name: "霧面卡套 100 入",
    slug: "demo-sleeves",
    description: "黑色霧面卡套，一包 100 張",
    type: "ACCESSORY",
    cardSet: null,
    cardNumber: null,
    rarity: null,
    pokemonType: null,
    language: "zh-HK",
    images: [
      {
        id: "home-img-sleeves",
        url: "/brand/home/scarlet-violet-151.png",
        alt: "霧面卡套 100 入",
      },
    ],
    variants: [
      {
        id: "home-var-sleeves",
        condition: "New",
        isFoil: false,
        price: 68,
        stock: 40,
        sku: "DEMO-SLEEVES-100",
      },
    ],
  },
  {
    id: "home-umbreon",
    name: "Umbreon VMAX",
    slug: "demo-umbreon-vmax-evolving",
    description: "Evolving Skies 月亮伊布 VMAX",
    type: "SINGLE",
    cardSet: "Evolving Skies",
    cardNumber: "215/203",
    rarity: "Secret Rare",
    pokemonType: "Darkness",
    language: "en",
    images: [
      {
        id: "home-img-umbreon",
        url: "/brand/home/umbreon-vmax.png",
        alt: "Umbreon VMAX",
      },
    ],
    variants: [
      {
        id: "home-var-umbreon",
        condition: "Near Mint (NM)",
        isFoil: false,
        price: 3200,
        stock: 1,
        sku: "EVS-215-NM",
      },
    ],
  },
  {
    id: "home-etb",
    name: "Scarlet & Violet—151 精英訓練家禮盒",
    slug: "demo-sv151-etb",
    description: "ETB 封盒，含補充包及配件",
    type: "SEALED_BOX",
    cardSet: "Scarlet & Violet—151",
    cardNumber: null,
    rarity: null,
    pokemonType: null,
    language: "zh-HK",
    images: [
      {
        id: "home-img-etb",
        url: "/brand/home/scarlet-violet-151.png",
        alt: "Scarlet & Violet—151 精英訓練家禮盒",
      },
    ],
    variants: [
      {
        id: "home-var-etb",
        condition: "Sealed",
        isFoil: false,
        price: 480,
        stock: 15,
        sku: "SV151-ETB",
      },
    ],
  },
];

const GENERIC_DEMO_IDS = new Set(["demo-1", "demo-2", "demo-3", "demo-4"]);

/** True when featured products are the untouched demo fallback, or there are none. */
export function isGenericDemoFeatured(products: { id: string }[]): boolean {
  if (products.length === 0) return true;
  return products.every((product) => GENERIC_DEMO_IDS.has(product.id));
}
