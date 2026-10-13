/** 前台顯示品牌（不含原店名） */
export const SITE_BRAND = "TCGHK";

/** @deprecated 僅相容舊引用；請用 SITE_BRAND */
export const SITE_NAME = "";
/** @deprecated 僅相容舊引用；請用 SITE_BRAND */
export const SITE_NAME_EN = SITE_BRAND;

export const SITE_TAGLINE = "香港 Pokémon TCG 專門店";

/** 前台顯示門市地址（頁尾、送貨頁、關於我們預設內容） */
export const SHOW_STORE_ADDRESS = true;
export const CURRENCY = "HKD";
export const LOCALE = "zh-HK";

export const STORE = {
  name: SITE_NAME,
  nameEn: SITE_NAME_EN,
  address: {
    zh: "九龍灣工業中心7樓28室",
    en: "Kowloon Bay Industrial Centre, 7/F Room 28",
  },
  hours: "週一至週日 12:00 – 22:00",
  mtr: "九龍灣站 B 出口，步行約 8 分鐘",
  /** Geocodable building query for the map pin and embed. */
  mapQuery: "Kowloon Bay Industrial Centre Room 28 7/F Hong Kong",
  /**
   * 門市公開電話（訓練家網站 T&R TCG HK）。
   * WhatsApp 浮動按鈕用此號碼；設定環境變數 WHATSAPP_NUMBER 可覆寫。
   */
  whatsapp: "66094893",
} as const;

export const PRODUCT_TYPES = [
  { value: "SINGLE", label: "單卡" },
  { value: "SEALED_BOX", label: "封盒" },
  { value: "BOOSTER_PACK", label: "補充包" },
  { value: "ACCESSORY", label: "配件" },
] as const;

export const CONDITIONS = [
  "Near Mint (NM)",
  "Lightly Played (LP)",
  "Moderately Played (MP)",
  "Heavily Played (HP)",
  "Damaged",
] as const;

export const NAV_ITEMS: {
  label: string;
  href: string;
  hasMegaMenu?: boolean;
}[] = [
  { label: "商品", href: "/products", hasMegaMenu: true },
  { label: "最新預訂", href: "/products?type=SEALED_BOX" },
  { label: "店賽", href: "/tournaments" },
  { label: "關於我們", href: "/about" },
  { label: "送貨方式", href: "/shipping" },
  { label: "付款方式", href: "/payment" },
];

/** 已上架遊戲。One Piece / Lorcana 尚未有商品，選單先不顯示。 */
export const PRODUCT_CATEGORIES = [
  {
    label: "Pokémon TCG",
    children: [
      { label: "繁體中文版", href: "/products?language=zh-HK" },
      { label: "英文版", href: "/products?language=en" },
      { label: "日文版", href: "/products?language=ja" },
      { label: "單卡", href: "/products?type=SINGLE" },
      { label: "封盒 / 補充包", href: "/products?type=SEALED_BOX" },
      { label: "配件", href: "/products?type=ACCESSORY" },
    ],
  },
] as const;

export const HERO_BANNERS = [
  {
    id: "1",
    title: "Scarlet & Violet 151",
    subtitle: "香港現貨 · 單卡及封盒",
    image:
      "https://images.pokemontcg.io/sv3pt5/logo.png",
    href: "/products?cardSet=151",
    gradient: "from-red-900/80 via-orange-900/60 to-black/90",
  },
  {
    id: "2",
    title: "店賽報名",
    subtitle: "每週舉辦 Pokémon 標準賽",
    image:
      "https://images.pokemontcg.io/sv1/logo.png",
    href: "/tournaments",
    gradient: "from-blue-900/80 via-indigo-900/60 to-black/90",
  },
] as const;
