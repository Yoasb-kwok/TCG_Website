"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Plus, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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

interface FeaturedProductOption {
  id: string;
  name: string;
  images: { url: string }[];
  variants: { price: number }[];
}

const DEFAULT_GRADIENTS = [
  { label: "紅橙", value: "from-red-900/80 via-orange-900/60 to-black/90" },
  { label: "藍靛", value: "from-blue-900/80 via-indigo-900/60 to-black/90" },
  { label: "紫粉", value: "from-purple-900/80 via-fuchsia-900/60 to-black/90" },
];

const EMPTY_BANNER: BannerFormItem = {
  id: "",
  title: "",
  subtitle: "",
  image: "",
  href: "/products",
  gradient: DEFAULT_GRADIENTS[0].value,
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
  const [activeTab, setActiveTab] = useState<"home" | "featured" | "about">("home");
  const [banners, setBanners] = useState<BannerFormItem[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductOption[]>([]);
  const [featuredPreview, setFeaturedPreview] = useState<FeaturedProductOption[]>([]);
  const [featuredAuto, setFeaturedAuto] = useState(true);
  const [bannersUsingDefaults, setBannersUsingDefaults] = useState(false);
  const [aboutFallback, setAboutFallback] = useState(false);
  const bannerFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<FeaturedProductOption[]>([]);

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

  const featuredSet = useMemo(() => new Set(featuredProductIds), [featuredProductIds]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const [homeRes, aboutRes] = await Promise.all([
        fetch("/api/admin/content/home"),
        fetch("/api/admin/content/about"),
      ]);

      const homeData = await parseJsonResponse<{
        banners?: BannerFormItem[];
        featuredProductIds?: string[];
        featuredProducts?: FeaturedProductOption[];
        featuredPreview?: FeaturedProductOption[];
        featuredAuto?: boolean;
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

      setBanners((homeData.banners ?? []).map((item: BannerFormItem) => ({ ...item })));
      setFeaturedProductIds(homeData.featuredProductIds ?? []);
      setFeaturedProducts(homeData.featuredProducts ?? []);
      setFeaturedPreview(homeData.featuredPreview ?? []);
      setFeaturedAuto(Boolean(homeData.featuredAuto));
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
    void loadContent();
  }, []);

  useEffect(() => {
    const keyword = productSearch.trim();
    if (!keyword) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(keyword)}`);
        const data = await parseJsonResponse(res);
        if (!res.ok) return;
        setProductResults((data.products as FeaturedProductOption[] | undefined) ?? []);
      } catch {
        // ignore search errors
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

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
          image: item.image,
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

  const saveFeaturedPreview = async () => {
    const ids = featuredPreview.map((product) => product.id).filter(Boolean);
    if (!ids.length) {
      setError("沒有可儲存的預覽商品");
      return;
    }
    setFeaturedProductIds(ids);
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        banners: banners.map((item) => ({
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          href: item.href,
          gradient: item.gradient,
          active: item.active,
        })),
        featuredProductIds: ids,
      };
      const res = await fetch("/api/admin/content/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "儲存熱門商品失敗");
      setMessage("熱門商品已儲存至資料庫");
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
            ["featured", "熱門商品"],
            ["about", "關於我們"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as "home" | "featured" | "about")}
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
        <p className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Banner 尚未儲存至資料庫，前台目前顯示預設內容。編輯後按「儲存首頁內容」即可同步。
        </p>
      )}
      {aboutFallback && activeTab === "about" && (
        <p className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          關於我們尚未儲存至資料庫，前台顯示預設文案。編輯後按「儲存關於我們」即可同步。
        </p>
      )}

      {error && <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      {message && <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{message}</p>}

      {activeTab === "home" && (
        <div className="space-y-3">
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
                <Input value={banner.href} onValueChange={(v) => setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, href: v } : item)))} placeholder="連結，例如 /products" />
                <select
                  value={banner.gradient}
                  onChange={(e) => setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, gradient: e.target.value } : item)))}
                  className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  {DEFAULT_GRADIENTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input value={banner.image} onValueChange={(v) => setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, image: v } : item)))} placeholder="圖片網址" className="md:col-span-2" />
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
                {banner.image && (
                  <div className="relative h-24 w-64 overflow-hidden rounded border border-border">
                    <Image src={banner.image} alt={banner.title || "banner"} fill className="object-cover" unoptimized />
                  </div>
                )}
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
          {featuredAuto && (
            <p className="rounded-md border border-blue-400/30 bg-blue-500/10 p-3 text-sm text-blue-200">
              尚未自訂熱門商品。前台目前顯示以下預覽（最新上架商品）：
            </p>
          )}
          {featuredAuto && featuredPreview.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {featuredPreview.map((product) => (
                  <div key={product.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium line-clamp-2">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.variants[0] ? `HK$${product.variants[0].price}` : "未設定價格"}
                    </p>
                  </div>
                ))}
              </div>
              <Button type="button" onClick={() => void saveFeaturedPreview()} disabled={saving}>
                將以上預覽商品儲存至資料庫
              </Button>
            </div>
          )}

          <SearchInput
            value={productSearch}
            onValueChange={setProductSearch}
            placeholder="搜尋商品名稱、系列..."
            className="max-w-md"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {productResults.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.variants[0] ? `HK$${product.variants[0].price}` : "未設定價格"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={featuredSet.has(product.id) || featuredProductIds.length >= 8}
                  onClick={() =>
                    setFeaturedProductIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]))
                  }
                >
                  加入
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">目前熱門商品（{featuredProductIds.length}/8）</p>
            {featuredProductIds.map((productId, index) => {
              const product = featuredProducts.find((item) => item.id === productId);
              return (
                <div key={productId} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span>{product?.name ?? productId}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setFeaturedProductIds((prev) => moveItem(prev, index, -1))}>上移</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setFeaturedProductIds((prev) => moveItem(prev, index, 1))}>下移</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setFeaturedProductIds((prev) => prev.filter((id) => id !== productId))}>移除</Button>
                  </div>
                </div>
              );
            })}
            <Button type="button" onClick={() => void saveHome()} disabled={saving}>
              儲存熱門商品
            </Button>
          </div>
        </div>
      )}

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
