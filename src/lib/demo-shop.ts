import { DEMO_PRODUCTS, DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { productMatchesSearch } from "@/lib/product-search";
import type { ProductWithVariants } from "@/lib/types";

export {
  DEMO_ADMIN_PATH,
  DEMO_POS_DESKS,
  DEMO_POS_PATH,
  DEMO_STORE_PATH,
  demoPosPath,
  demoSurface,
  isDemoAuthBypassPath,
  isDemoPosDesk,
  isDemoShellPath,
  isDemoStorePath,
  type DemoPosDeskId,
  type DemoSurface,
} from "@/lib/demo-paths";

/** Shown on every blocked demo write. */
export const DEMO_WRITE_DISCLAIMER = "示範店唔會儲存任何改動";

export const DEMO_CART_STORAGE_KEY = "tcg-hk-demo-cart";

/** Fictional Mong Kok shop. Distinct from the live Kowloon Bay storefront. */
export const DEMO_SHOP = {
  name: "旺角示範卡店",
  address: {
    zh: "旺角西洋菜南街 128 號 3 樓",
    en: "3/F, 128 Sai Yeung Choi Street South, Mong Kok",
  },
  hours: "週一至週日 13:00 – 21:30",
  mtr: "旺角站 E2 出口，步行約 2 分鐘",
} as const;

/** Named owner for the demo admin/POS chrome. Not a real login. */
export const DEMO_OWNER = {
  name: "林子朗",
  title: "店主",
} as const;

export const DEMO_ORDERS = [
  {
    id: "MK-1042",
    email: "guest@example.com",
    item: "Charizard ex · Near Mint",
    total: 1280,
    status: "已付款",
    createdAt: "2026-10-12T06:30:00.000Z",
  },
  {
    id: "MK-1048",
    email: "walker@example.com",
    item: "151 精英訓練家禮盒",
    total: 480,
    status: "待自取",
    createdAt: "2026-10-18T08:15:00.000Z",
  },
] as const;

export const DEMO_ADMIN_LINKS = [
  { href: "/admin/demo", label: "總覽", exact: true },
  { href: "/admin/demo/orders", label: "訂單" },
  { href: "/admin/demo/tournaments", label: "店賽報名" },
] as const;

/** Demo copy of the overview group: 商品名單 lives under 收銀帳務, not beside 總覽. */
export const DEMO_CASHIER_LINKS = [{ href: "/admin/demo/products", label: "商品名單" }] as const;

export function demoWriteBody() {
  return { error: DEMO_WRITE_DISCLAIMER };
}

export function demoTrialWhatsAppHref(base: string | null | undefined): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("text", "你好，我想了解 TCGHK 網店試用。");
    return url.toString();
  } catch {
    return base;
  }
}

export function filterDemoCatalog(input: {
  search?: string;
  type?: string;
  inStock?: boolean;
}): ProductWithVariants[] {
  let products: ProductWithVariants[] = DEMO_PRODUCTS;
  if (input.type) products = products.filter((product) => product.type === input.type);
  if (input.inStock) {
    products = products.filter((product) =>
      product.variants.some((variant) => variant.stock > 0 && variant.price > 0),
    );
  }
  const search = input.search?.trim();
  if (search) products = products.filter((product) => productMatchesSearch(product, search));
  return products;
}

export function getDemoProductBySlug(slug: string): ProductWithVariants | undefined {
  return DEMO_PRODUCTS.find((product) => product.slug === slug);
}

export function getDemoTournament(slug: string) {
  return DEMO_TOURNAMENTS.find((tournament) => tournament.slug === slug);
}

export function demoShopStats() {
  const variants = DEMO_PRODUCTS.flatMap((product) => product.variants);
  return {
    products: DEMO_PRODUCTS.length,
    skus: variants.length,
    lowStock: variants.filter((variant) => variant.stock > 0 && variant.stock <= 3).length,
    tournaments: DEMO_TOURNAMENTS.length,
    orders: DEMO_ORDERS.length,
    revenue: DEMO_ORDERS.reduce((sum, order) => sum + order.total, 0),
  };
}
