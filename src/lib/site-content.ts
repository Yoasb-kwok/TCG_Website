import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { HERO_BANNERS, SHOW_STORE_ADDRESS, SITE_BRAND, STORE } from "@/lib/constants";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getSellableQuantity } from "@/lib/inventory";
import type { ProductWithVariants } from "@/lib/types";

export interface HomeBannerItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  gradient: string;
  active?: boolean;
  sortIndex?: number;
}

export interface AboutSectionItem {
  id: string;
  title: string;
  body: string;
}

export interface AboutContent {
  pageTitle: string;
  pageSubtitle: string;
  sections: AboutSectionItem[];
  storeAddressZh: string;
  storeAddressEn: string;
  storeHours: string;
  storeMtr: string;
  mapEmbedUrl: string;
  contactBody: string;
  showStoreInfo: boolean;
}

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  pageTitle: "關於我們",
  pageSubtitle: `${SITE_BRAND} — 香港 Pokémon TCG 專門店`,
  sections: [
    {
      id: "who-we-are",
      title: "我們是誰",
      body:
        `${SITE_BRAND} 專注 Pokémon TCG 的卡牌平台。我們提供單卡買賣、最新系列封盒及補充包現貨，並定期舉辦店內標準賽及新手友善賽，歡迎各位訓練家交流、組牌與對戰。\n\n` +
        "無論你是收藏玩家、競技牌手，還是剛入門的新手，我們都樂意為你解答卡牌、品相及賽制相關問題。",
    },
    {
      id: "what-we-offer",
      title: "我們提供",
      body:
        "Pokémon TCG 單卡、封盒、補充包及周邊配件\n" +
        "每週店賽 — 標準賽制、瑞士輪及淘汰賽\n" +
        "門市自取（詳情請下單後與我們確認）",
    },
  ],
  storeAddressZh: STORE.address.zh,
  storeAddressEn: STORE.address.en,
  storeHours: STORE.hours,
  storeMtr: STORE.mtr,
  mapEmbedUrl: "",
  contactBody:
    "如有商品查詢、預留或賽事報名問題，歡迎透過網站右下角 WhatsApp 按鈕與我們聯絡。\n\n線上訂單一般於 1–2 個工作天內處理；門市自取請待收到「可取貨」通知後前往。",
  showStoreInfo: SHOW_STORE_ADDRESS,
};

export interface HomeContent {
  banners: HomeBannerItem[];
  featuredProducts: ProductWithVariants[];
  /** True when banner or featured data comes from defaults, not CMS rows */
  fallback: boolean;
  /** True when featured section uses auto-picked products (no CMS selection) */
  featuredAuto: boolean;
}

export function getDefaultHomeBanners(): HomeBannerItem[] {
  return HERO_BANNERS.map((banner, index) => ({
    ...banner,
    image: banner.image,
    sortIndex: index,
    active: true,
  }));
}

const productInclude = {
  variants: { orderBy: { price: "asc" as const } },
  images: { orderBy: { sortOrder: "asc" as const } },
};

async function fetchAutoFeaturedProducts(): Promise<ProductWithVariants[]> {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    include: productInclude,
  });
  return products as ProductWithVariants[];
}

function normalizeSections(raw: unknown): AboutSectionItem[] {
  if (!Array.isArray(raw)) return DEFAULT_ABOUT_CONTENT.sections;
  const sections = raw
    .map((item, index) => {
      const row = item as Partial<AboutSectionItem>;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `section-${index + 1}`;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const body = typeof row.body === "string" ? row.body.trim() : "";
      if (!title || !body) return null;
      return { id, title, body };
    })
    .filter(Boolean) as AboutSectionItem[];
  return sections.length ? sections : DEFAULT_ABOUT_CONTENT.sections;
}

function normalizeMapEmbedUrl(raw: string | null | undefined): string {
  if (!raw) return "";
  const text = raw.trim();
  if (!text) return "";

  const iframeMatch = text.match(/src=["']([^"']+)["']/i);
  const url = iframeMatch?.[1] ?? text;

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    const host = parsed.hostname.toLowerCase();
    const allowed = host.endsWith("google.com") || host.endsWith("google.com.hk") || host === "maps.google.com";
    return allowed ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export async function getHomeContent(): Promise<HomeContent> {
  const defaultBanners = getDefaultHomeBanners();
  const demoFeatured = DEMO_PRODUCTS.slice(0, 4);

  const fallback: HomeContent = {
    banners: defaultBanners,
    featuredProducts: demoFeatured,
    fallback: true,
    featuredAuto: true,
  };

  if (!isDatabaseConfigured()) return fallback;

  try {
    const prisma = getPrisma();
    const [bannerRows, featuredRows] = await Promise.all([
      prisma.homeBanner.findMany({
        where: { active: true },
        orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
      }),
      prisma.homeFeaturedProduct.findMany({
        orderBy: { sortIndex: "asc" },
        include: { product: { include: productInclude } },
      }),
    ]);

    const usingDefaultBanners = bannerRows.length === 0;
    const banners: HomeBannerItem[] = usingDefaultBanners
      ? defaultBanners
      : bannerRows.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          image: item.imageUrl,
          href: item.href,
          gradient: item.gradient,
          active: item.active,
          sortIndex: item.sortIndex,
        }));

    let featuredProducts: ProductWithVariants[];
    let featuredAuto = false;

    if (featuredRows.length) {
      featuredProducts = featuredRows.map((row) => row.product as ProductWithVariants);
    } else {
      featuredAuto = true;
      const autoProducts = await fetchAutoFeaturedProducts();
      featuredProducts = autoProducts.length ? autoProducts : demoFeatured;
    }

    // ADR-005 Decision 6: Apply buffer zone to featured products on home page
    // so customers see sellable quantity, not raw actual stock.
    if (!featuredAuto || featuredProducts !== demoFeatured) {
      const shopSetting = await prisma.shopSetting.findUnique({
        where: { id: "default" },
      });
      const globalCritical = shopSetting?.defaultCriticalThreshold ?? 2;

      featuredProducts = featuredProducts
        .filter((p) =>
          p.variants.some(
            (v) => getSellableQuantity(v.stock, v.criticalThreshold ?? globalCritical) > 0,
          ),
        )
        .map((p) => ({
          ...p,
          variants: p.variants.map((v) => ({
            ...v,
            stock: getSellableQuantity(v.stock, v.criticalThreshold ?? globalCritical),
          })),
        }));

      // Fallback to demo if all featured products are out of sellable stock
      if (featuredProducts.length === 0 && !featuredAuto) {
        featuredProducts = demoFeatured;
      }
    }

    return {
      banners,
      featuredProducts,
      fallback: usingDefaultBanners || featuredAuto,
      featuredAuto,
    };
  } catch {
    return fallback;
  }
}

export async function getAboutContent(): Promise<AboutContent> {
  if (!isDatabaseConfigured()) return DEFAULT_ABOUT_CONTENT;

  try {
    const prisma = getPrisma();
    const row = await prisma.aboutPageContent.findUnique({
      where: { id: "default" },
    });
    if (!row) return DEFAULT_ABOUT_CONTENT;

    return {
      pageTitle: row.pageTitle || DEFAULT_ABOUT_CONTENT.pageTitle,
      pageSubtitle: row.pageSubtitle || DEFAULT_ABOUT_CONTENT.pageSubtitle,
      sections: normalizeSections(row.sections),
      storeAddressZh: row.storeAddressZh || DEFAULT_ABOUT_CONTENT.storeAddressZh,
      storeAddressEn: row.storeAddressEn || DEFAULT_ABOUT_CONTENT.storeAddressEn,
      storeHours: row.storeHours || DEFAULT_ABOUT_CONTENT.storeHours,
      storeMtr: row.storeMtr || DEFAULT_ABOUT_CONTENT.storeMtr,
      mapEmbedUrl: normalizeMapEmbedUrl(row.mapEmbedUrl),
      contactBody: row.contactBody || DEFAULT_ABOUT_CONTENT.contactBody,
      showStoreInfo: row.showStoreInfo,
    };
  } catch {
    return DEFAULT_ABOUT_CONTENT;
  }
}
