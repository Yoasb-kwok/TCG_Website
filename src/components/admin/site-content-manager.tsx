"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Plus, Trash2, Upload } from "lucide-react";
import { HomeServicesEditor } from "@/components/admin/home-services-editor";
import { MapVideoEditor } from "@/components/admin/map-video-editor";
import { MenuBannerEditor } from "@/components/admin/menu-banner-editor";
import { RecycleListingsEditor } from "@/components/admin/recycle-listings-editor";
import { BUILTIN_HERO_ARTWORK, heroUsesBuiltinArtwork } from "@/lib/home-hero";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BannerFormItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  gradient: string;
  active: boolean;
}

interface SectionFormItem {
  id: string;
  title: string;
  body: string;
}

const EMPTY_BANNER: BannerFormItem = {
  id: "",
  title: "",
  subtitle: "",
  image: "",
  href: "/products",
  gradient: "",
  active: true,
};

async function parseJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "伺服器回應格式錯誤"
        : `請求失敗（${res.status}），請重新整理或稍後再試`,
    );
  }
}

export function SiteContentManager() {
  const [activeTab, setActiveTab] = useState<"home" | "menu" | "featured" | "services" | "recycle" | "about">("home");
  const [banners, setBanners] = useState<BannerFormItem[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [popularProducts, setPopularProducts] = useState<{ id: string; name: string; purchaseCount: number }[]>([]);
  const [bannersUsingDefaults, setBannersUsingDefaults] = useState(false);
  const [aboutFallback, setAboutFallback] = useState(false);
  const bannerFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [pageTitle, setPageTitle] = useState("");
  const [pageSubtitle, setPageSubtitle] = useState("");
  const [sections, setSections] = useState<SectionFormItem[]>([]);
  const [storeAddressZh, setStoreAddressZh] = useState("");
  const [storeAddressEn, setStoreAddressEn] = useState("");
  const [storeHours, setStoreHours] = useState("");
  const [storeMtr, setStoreMtr] = useState("");
  const [mapEmbedUrl, setMapEmbedUrl] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [showStoreInfo, setShowStoreInfo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    try {
      const [homeRes, aboutRes] = await Promise.all([
        fetch("/api/admin/content/home"),
        fetch("/api/admin/content/about"),
      ]);

      const homeData = await parseJsonResponse<{
        banners?: BannerFormItem[];
        featuredProductIds?: string[];
        popularProducts?: { id: string; name: string; purchaseCount: number }[];
        bannersUsingDefaults?: boolean;
        fallback?: boolean;
        error?: string;
      }>(homeRes);
      const aboutData = await parseJsonResponse<{
        pageTitle?: string;
        pageSubtitle?: string;
        sections?: SectionFormItem[];
        storeAddressZh?: string;
        storeAddressEn?: string;
        storeHours?: string;
        storeMtr?: string;
        mapEmbedUrl?: string;
        contactBody?: string;
        showStoreInfo?: boolean;
        fallback?: boolean;
        error?: string;
      }>(aboutRes);

      if (!homeRes.ok) throw new Error(homeData.error ?? "讀取首頁內容失敗");
      if (!aboutRes.ok) throw new Error(aboutData.error ?? "讀取關於我們失敗");
      setError(null);

      setBanners((homeData.banners ?? []).map((item: BannerFormItem) => ({ ...item })));
      setFeaturedProductIds(homeData.featuredProductIds ?? []);
      setPopularProducts(homeData.popularProducts ?? []);
      setBannersUsingDefaults(Boolean(homeData.bannersUsingDefaults ?? homeData.fallback));

      setPageTitle(aboutData.pageTitle ?? "");
      setPageSubtitle(aboutData.pageSubtitle ?? "");
      setSections(Array.isArray(aboutData.sections) ? aboutData.sections : []);
      setStoreAddressZh(aboutData.storeAddressZh ?? "");
      setStoreAddressEn(aboutData.storeAddressEn ?? "");
      setStoreHours(aboutData.storeHours ?? "");
      setStoreMtr(aboutData.storeMtr ?? "");
      setMapEmbedUrl(aboutData.mapEmbedUrl ?? "");
      setContactBody(aboutData.contactBody ?? "");
      setShowStoreInfo(Boolean(aboutData.showStoreInfo));
      setAboutFallback(Boolean(aboutData.fallback));
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadContent();
    })();
  }, []);

  const moveItem = <T,>(list: T[], index: number, direction: -1 | 1): T[] => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return list;
    const clone = [...list];
    const [item] = clone.splice(index, 1);
    clone.splice(target, 0, item);
    return clone;
  };

  const uploadBannerImage = async (file: File, index: number) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "banners");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await parseJsonResponse<{ error?: string; url?: string }>(res);
    if (!res.ok) throw new Error(data.error ?? "上傳失敗");
    setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, image: data.url ?? "" } : item)));
  };

  const saveHome = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        banners: banners.map((item) => ({
          title: item.title,
          subtitle: item.subtitle,
          image: item.image.trim() || BUILTIN_HERO_ARTWORK,
          href: item.href,
          gradient: item.gradient,
          active: item.active,
        })),
        featuredProductIds,
      };
      const res = await fetch("/api/admin/content/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "儲存首頁內容失敗");
      setMessage("首頁內容已更新");
      await loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageTitle,
          pageSubtitle,
          sections,
          storeAddressZh,
          storeAddressEn,
          storeHours,
          storeMtr,
          mapEmbedUrl,
          contactBody,
          showStoreInfo,
        }),
      });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "儲存關於我們失敗");
      setMessage("關於我們已更新");
      await loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">載入中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 border-b border-border">
          {[
            ["home", "首頁 Banner"],
            ["menu", "商品選單"],
            ["featured", "熱門商品"],
            ["services", "首頁服務卡"],
            ["recycle", "單卡回收"],
            ["about", "關於我們"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as "home" | "menu" | "featured" | "services" | "recycle" | "about")}
              className={cn(
                "border-b-2 px-4 py-2 text-sm transition",
                activeTab === key
                  ? "border-pink-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="mr-1 h-4 w-4" /> 預覽首頁
          </Link>
          <Link
            href="/about"
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="mr-1 h-4 w-4" /> 預覽關於我們
          </Link>
        </div>
      </div>

      {bannersUsingDefaults && activeTab === "home" && (
        <p className="rounded-md border border-amber-700/40 bg-amber-100 p-3 text-sm font-medium text-amber-950 dark:border-amber-300/40 dark:bg-amber-500/20 dark:text-amber-50">
          Banner 尚未儲存至資料庫，前台目前顯示預設內容。編輯後按「儲存首頁內容」即可同步。
        </p>
      )}
      {aboutFallback && activeTab === "about" && (
        <p className="rounded-md border border-amber-700/40 bg-amber-100 p-3 text-sm font-medium text-amber-950 dark:border-amber-300/40 dark:bg-amber-500/20 dark:text-amber-50">
          關於我們尚未儲存至資料庫，前台顯示預設文案。編輯後按「儲存關於我們」即可同步。
        </p>
      )}

      {error && <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      {message && <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{message}</p>}

      {activeTab === "menu" && <MenuBannerEditor />}

      {activeTab === "home" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            左右切換時，標題、副標題與右側圖片會一起更換。Scarlet & Violet 151 若仍用預設系列圖，右側會顯示店內卡圖組合；上傳或貼上圖片後改為顯示該圖。
          </p>
          {banners.map((banner, index) => (
            <div key={`${banner.id || "new"}-${index}`} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Banner #{index + 1}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setBanners((prev) => moveItem(prev, index, -1))}>上移</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setBanners((prev) => moveItem(prev, index, 1))}>下移</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setBanners((prev) => prev.filter((_, i) => i !== index))}>
                    <Trash2 className="mr-1 h-4 w-4" /> 刪除
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input value={banner.title} onValueChange={(v) => setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, title: v } : item)))} placeholder="標題" />
                <Input value={banner.subtitle} onValueChange={(v) => setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, subtitle: v } : item)))} placeholder="副標題" />
                <Input
                  value={banner.image === BUILTIN_HERO_ARTWORK ? "" : banner.image}
                  onValueChange={(v) => setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, image: v } : item)))}
                  placeholder="右側圖片網址，留空可按下方改回預設卡圖"
                  className="md:col-span-2"
                />
                <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                  <input
                    ref={(el) => {
                      bannerFileInputRefs.current[index] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadBannerImage(file, index);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "上傳失敗");
                      } finally {
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bannerFileInputRefs.current[index]?.click()}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    上傳圖片
                  </Button>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={banner.active}
                      onCheckedChange={(checked) =>
                        setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, active: Boolean(checked) } : item)))
                      }
                    />
                    <span className="text-sm">啟用</span>
                  </div>
                </div>
                {banner.image && !heroUsesBuiltinArtwork(banner) && (
                  <div className="relative h-24 w-64 overflow-hidden rounded border border-border">
                    <Image src={banner.image} alt={banner.title || "banner"} fill className="object-cover" unoptimized />
                  </div>
                )}
                {heroUsesBuiltinArtwork(banner) && (
                  <p className="text-sm text-muted-foreground md:col-span-2">右側顯示預設 151 卡圖組合。</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, image: BUILTIN_HERO_ARTWORK } : item)))
                  }
                >
                  右側改回預設 151 卡圖
                </Button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setBanners((prev) => [...prev, { ...EMPTY_BANNER }])}>
              <Plus className="mr-1 h-4 w-4" /> 新增 Banner
            </Button>
            <Button type="button" onClick={() => void saveHome()} disabled={saving}>
              儲存首頁內容
            </Button>
          </div>
        </div>
      )}

      {activeTab === "featured" && (
        <div className="space-y-4">
          <p className="rounded-md border border-blue-400/30 bg-blue-500/10 p-3 text-sm text-blue-100">
            熱門商品暫時不顯示缺貨，並按已完成購買件數（已付款、已出貨或已完成訂單）排前 4。手動名單不會改前台。
          </p>
          {popularProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">目前沒有有貨商品。</p>
          ) : (
            <ol className="space-y-2">
              {popularProducts.map((product, index) => (
                <li key={product.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <span>
                    {index + 1}. {product.name}
                  </span>
                  <span className="text-muted-foreground">已完成購買 {product.purchaseCount} 件</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {activeTab === "services" && <HomeServicesEditor />}
      {activeTab === "recycle" && <RecycleListingsEditor />}

      {activeTab === "about" && (
        <div className="space-y-3">
          <Input value={pageTitle} onValueChange={setPageTitle} placeholder="頁面標題" />
          <Input value={pageSubtitle} onValueChange={setPageSubtitle} placeholder="頁面副標題" />

          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">內容區塊</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSections((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), title: "", body: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> 新增區塊
              </Button>
            </div>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div key={section.id || index} className="rounded-md border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">區塊 #{index + 1}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 className="mr-1 h-4 w-4" /> 刪除
                    </Button>
                  </div>
                  <Input
                    value={section.title}
                    onValueChange={(v) =>
                      setSections((prev) => prev.map((item, i) => (i === index ? { ...item, title: v } : item)))
                    }
                    placeholder="區塊標題"
                  />
                  <textarea
                    value={section.body}
                    onChange={(e) =>
                      setSections((prev) => prev.map((item, i) => (i === index ? { ...item, body: e.target.value } : item)))
                    }
                    rows={5}
                    className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="區塊內容（純文字，換行會保留）"
                  />
                </div>
              ))}
            </div>
          </div>

          <Input value={storeAddressZh} onValueChange={setStoreAddressZh} placeholder="中文地址" />
          <Input value={storeAddressEn} onValueChange={setStoreAddressEn} placeholder="英文地址" />
          <Input value={storeHours} onValueChange={setStoreHours} placeholder="營業時間" />
          <Input value={storeMtr} onValueChange={setStoreMtr} placeholder="地鐵資訊" />
          <Input value={mapEmbedUrl} onValueChange={setMapEmbedUrl} placeholder="Google map iframe src 或完整 iframe 字串" />
          <MapVideoEditor />
          <textarea
            value={contactBody}
            onChange={(e) => setContactBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            placeholder="聯絡我們內容"
          />
          <div className="flex items-center gap-2">
            <Checkbox checked={showStoreInfo} onCheckedChange={(checked) => setShowStoreInfo(Boolean(checked))} />
            <span className="text-sm">顯示門市資訊與地圖</span>
          </div>
          <Button type="button" onClick={() => void saveAbout()} disabled={saving}>
            儲存關於我們
          </Button>
        </div>
      )}
    </div>
  );
}
