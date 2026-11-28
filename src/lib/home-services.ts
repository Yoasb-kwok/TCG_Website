export interface HomeServiceCardContent {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  href: string;
}

/** Titles and body match the homepage cards already on the storefront. */
export const DEFAULT_HOME_SERVICES: readonly HomeServiceCardContent[] = [
  {
    id: "singles",
    title: "單卡買賣",
    body: "按系列、稀有度、屬性篩選，支援 NM/LP 等品相標示",
    imageUrl: "/brand/home/charizard-ex.png",
    href: "/products?type=SINGLE",
  },
  {
    id: "sealed",
    title: "封盒預訂",
    body: "最新 Pokémon 系列封盒及補充包，香港現貨發售",
    imageUrl: "/brand/home/mew-ex-151.png",
    href: "/products?type=SEALED_BOX",
  },
  {
    id: "events",
    title: "店賽報名",
    body: "標準賽、新手賽 — 店內舉辦",
    imageUrl: "/brand/home/pikachu-151.png",
    href: "/tournaments",
  },
];

const SERVICE_IDS = new Set(DEFAULT_HOME_SERVICES.map((service) => service.id));

export function resolveHomeServices(
  rows: readonly Partial<HomeServiceCardContent>[],
): HomeServiceCardContent[] {
  return DEFAULT_HOME_SERVICES.map((fallback) => {
    const row = rows.find((item) => item.id === fallback.id);
    if (!row) return { ...fallback };
    const title = row.title?.trim();
    const body = row.body?.trim();
    const href = row.href?.trim();
    const imageUrl = row.imageUrl?.trim();
    return {
      id: fallback.id,
      title: title || fallback.title,
      body: body || fallback.body,
      href: href || fallback.href,
      imageUrl: imageUrl || fallback.imageUrl,
    };
  });
}

export function parseHomeServiceEdits(
  raw: unknown,
): { ok: true; services: HomeServiceCardContent[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "服務卡格式不正確" };
  const byId = new Map<string, HomeServiceCardContent>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, error: "服務卡格式不正確" };
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!SERVICE_IDS.has(id) || byId.has(id)) {
      return { ok: false, error: "服務卡編號不正確" };
    }
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const body = typeof row.body === "string" ? row.body.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";
    const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl.trim() : "";
    if (!title || title.length > 80) return { ok: false, error: "請填寫服務卡標題" };
    if (!body || body.length > 400) return { ok: false, error: "請填寫服務卡內文" };
    if (!href.startsWith("/") || href.startsWith("//")) {
      return { ok: false, error: "服務卡連結須為站內路徑" };
    }
    if (imageUrl && !isServiceImage(imageUrl)) {
      return { ok: false, error: "服務卡圖片須為站內路徑或 http(s) 網址" };
    }
    byId.set(id, { id, title, body, href, imageUrl });
  }
  if (byId.size !== SERVICE_IDS.size) return { ok: false, error: "請一併儲存三張服務卡" };
  return { ok: true, services: DEFAULT_HOME_SERVICES.map((service) => byId.get(service.id)!) };
}

function isServiceImage(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
