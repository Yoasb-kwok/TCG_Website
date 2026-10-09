"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BarcodeScanButton } from "@/components/barcode-scan-button";
import { PosShell } from "@/components/pos/pos-nav";
import { SET_SERIES_CODES } from "@/lib/card-taxonomy";
import { PRODUCT_TYPES } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { Receipt } from "@/lib/pos-shared";
import type { ProductSort, ProductWithVariants } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePublicTaxonomy } from "@/hooks/use-public-taxonomy";

const KINDS = [{ value: "", label: "全部" }, ...PRODUCT_TYPES] as const;
const STOCK_FILTERS = [
  { value: "all", label: "全部" },
  { value: "out", label: "缺貨" },
  { value: "low", label: "低庫存" },
  { value: "unpriced", label: "未定價" },
  { value: "in", label: "有貨" },
] as const;

type StockFilter = (typeof STOCK_FILTERS)[number]["value"];

function stockTags(stock: number, price: number, foil: boolean) {
  const tags: { label: string; className: string }[] = [];
  if (stock <= 0) tags.push({ label: "缺貨", className: "bg-red-500/15 text-red-400" });
  else if (stock <= 2) tags.push({ label: "低庫存", className: "bg-amber-500/15 text-amber-300" });
  if (price <= 0) tags.push({ label: "未定價", className: "bg-muted text-muted-foreground" });
  if (foil) tags.push({ label: "閃", className: "bg-pink-500/20 text-pink-300" });
  return tags;
}

function matchesStock(stock: number, price: number, filter: StockFilter) {
  if (filter === "out") return stock <= 0;
  if (filter === "low") return stock > 0 && stock <= 2;
  if (filter === "unpriced") return price <= 0;
  if (filter === "in") return stock > 0;
  return true;
}

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-pink-400";

const dangerButton =
  "inline-flex h-8 shrink-0 items-center rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-bold text-red-400 hover:bg-red-500/20";

const pillClass = (active: boolean) =>
  cn(
    "h-8 rounded-full border px-3 text-sm font-bold",
    active ? "border-pink-500 bg-pink-500 text-white" : "border-border bg-muted text-muted-foreground",
  );

export function PosReceiving() {
  const { labelFor, options } = usePublicTaxonomy();
  const taxonomySeries = options("SET_CODE").filter((item) => item.active);
  const series = [
    ...SET_SERIES_CODES.map((item) => {
      const custom = taxonomySeries.find((entry) => entry.value === item.value);
      return { value: item.value, label: custom?.label ?? item.label };
    }),
    ...taxonomySeries
      .filter((item) => !SET_SERIES_CODES.some((entry) => entry.value === item.value))
      .map((item) => ({ value: item.value, label: item.label })),
  ];
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProductSort>("newest");
  const [kind, setKind] = useState("");
  const [setCodes, setSetCodes] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const loadProducts = async (search: string, nextSort: ProductSort, nextKind: string) => {
    const params = new URLSearchParams({ pageSize: "96", search });
    if (nextSort !== "newest") params.set("sort", nextSort);
    if (nextKind) params.set("type", nextKind);
    const res = await fetch(`/api/products?${params}`);
    const data = (await res.json()) as { products: ProductWithVariants[] };
    setProducts(data.products ?? []);
  };

  const loadReceipts = async () => {
    const res = await fetch("/api/pos/receipts");
    const data = (await res.json()) as { receipts: Receipt[] };
    setReceipts(data.receipts ?? []);
  };

  useEffect(() => {
    loadReceipts().catch(() => undefined);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      loadProducts(query, sort, kind).catch(() => setProducts([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, sort, kind]);

  const selected =
    products.find((product) => product.variants.some((entry) => entry.id === selectedVariantId)) ?? null;
  const variant = selected?.variants.find((entry) => entry.id === selectedVariantId) ?? null;
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const cost = Number(unitCost);
  const totalCost = qty > 0 && Number.isFinite(cost) && cost >= 0 ? qty * cost : 0;

  const choose = (product: ProductWithVariants, nextId: string) => {
    const next = product.variants.find((entry) => entry.id === nextId);
    setSelectedVariantId(nextId);
    setQuantity("1");
    setUnitCost("");
    setUnitPrice(next && next.price > 0 ? String(next.price) : "");
    setError("");
  };

  const receive = async () => {
    if (!selected || !variant) return;
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/pos/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          variantId: variant.id,
          name: selected.name,
          sku: variant.sku,
          quantity: qty,
          unitCost: cost,
          unitPrice: Number(unitPrice),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "未能入貨");
        return;
      }
      setQuantity("1");
      setUnitCost("");
      await Promise.all([loadProducts(query, sort, kind), loadReceipts()]);
    } catch {
      setError("未能入貨，請再試一次");
    } finally {
      setPending(false);
    }
  };

  const undo = async (id: string) => {
    if (!window.confirm("撤銷這筆來貨？庫存會扣回，進貨成本也不再計入損益。")) return;
    await fetch(`/api/pos/receipts?id=${id}`, { method: "DELETE" });
    await Promise.all([loadProducts(query, sort, kind), loadReceipts()]);
  };

  const scanIntoReceiving = async (code: string) => {
    setQuery(code);
    try {
      const res = await fetch(`/api/pos/lookup?q=${encodeURIComponent(code)}`);
      const data = (await res.json()) as {
        match?: { product: ProductWithVariants; variantId: string } | null;
      };
      const match = data.match;
      if (!match) return;
      setProducts((current) =>
        current.some((product) => product.id === match.product.id) ? current : [match.product, ...current],
      );
      choose(match.product, match.variantId);
    } catch {
      setError("搜尋失敗，請再試一次");
    }
  };

  const toggleSet = (value: string) => {
    setSetCodes((current) =>
      current.includes(value) ? current.filter((code) => code !== value) : [...current, value],
    );
  };

  const rows = products
    .filter((product) => setCodes.length === 0 || (product.setCode != null && setCodes.includes(product.setCode)))
    .flatMap((product) =>
      product.variants
        .filter((item) => matchesStock(item.stock, item.price, stockFilter))
        .map((item) => ({ product, item })),
    )
    .sort((a, b) => {
      if (sort === "priceAsc") return a.item.price - b.item.price;
      if (sort === "priceDesc") return b.item.price - a.item.price;
      return 0;
    });

  return (
    <PosShell current="receiving">
      <div className="grid h-full min-h-0 gap-4 overflow-auto p-4 lg:grid-cols-[14rem_minmax(0,1fr)_22rem] lg:overflow-hidden">
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-[14px] border border-border bg-card p-3">
          <p className="text-sm font-extrabold text-muted-foreground">排序同篩選</p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="條碼 / 卡名 / 編號"
              aria-label="搜尋來貨"
              className={cn(fieldClass, "h-11 min-w-0 flex-1")}
            />
            <BarcodeScanButton onDetect={(code) => void scanIntoReceiving(code)} />
          </div>
          <label className="block text-xs font-bold text-muted-foreground">
            排序
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ProductSort)}
              className={cn(fieldClass, "mt-1")}
            >
              <option value="newest">最新上架</option>
              <option value="setCode">系列編號 (M3→M1L…)</option>
              <option value="rarityTier">稀有度 (MUR→R…)</option>
              <option value="priceAsc">價格由低至高</option>
              <option value="priceDesc">價格由高至低</option>
            </select>
          </label>
          <div>
            <p className="text-xs font-bold text-muted-foreground">系列</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSetCodes([])}
                className={pillClass(setCodes.length === 0)}
              >
                全部系列
              </button>
              {series.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleSet(item.value)}
                  className={pillClass(setCodes.includes(item.value))}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {KINDS.map((item) => (
              <button
                key={item.value || "all-kind"}
                type="button"
                onClick={() => setKind(item.value)}
                className={pillClass(kind === item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {STOCK_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStockFilter(item.value)}
                className={pillClass(stockFilter === item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card p-3">
          <p className="text-sm font-extrabold text-muted-foreground">已上架貨品 · 撳一下就點算</p>
          <ul
            className="mt-3 grid min-h-0 flex-1 content-start justify-start gap-2 overflow-auto pr-1"
            style={{ gridTemplateColumns: "repeat(auto-fill, 7.25rem)" }}
          >
            {rows.map(({ product, item }) => {
              const image = product.images[0];
              const active = item.id === selectedVariantId;
              const detail = item.condition;
              const label = product.variants.length > 1 ? `${product.name} · ${detail}` : product.name;
              const tags = stockTags(item.stock, item.price, item.isFoil);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(product, item.id)}
                    className={cn(
                      "flex h-full w-[7.25rem] flex-col rounded-[10px] border bg-transparent p-1 text-left",
                      active ? "border-pink-500" : "border-transparent hover:border-pink-400",
                    )}
                  >
                    <span className="relative block aspect-[63/88] overflow-hidden rounded-md">
                      {image ? (
                        <Image
                          src={image.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="116px"
                          unoptimized
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                          無圖
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {product.setCode && (
                        <span className="rounded-full bg-pink-500 px-1.5 text-[10px] font-bold text-white">
                          {labelFor("SET_CODE", product.setCode)}
                        </span>
                      )}
                      {(product.rarityTier || product.rarity) && (
                        <span className="max-w-full truncate rounded-full bg-muted px-1.5 text-[10px] font-bold">
                          {product.rarityTier ? labelFor("RARITY", product.rarityTier) : product.rarity}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 line-clamp-2 text-sm font-extrabold leading-snug">{label}</span>
                    {tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag.label}
                            className={cn("rounded-full px-1.5 text-[10px] font-bold", tag.className)}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="mt-auto pt-1 text-xs font-bold text-muted-foreground">
                      存 {item.stock}
                      {item.price > 0 ? ` · ${formatPrice(item.price)}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="col-span-full px-2 py-8 text-center text-sm font-bold text-muted-foreground">
                {products.length === 0
                  ? "未有上架貨品。請先在後台商品名單加入。"
                  : "沒有符合條件的貨品"}
              </li>
            )}
          </ul>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-[14px] border border-border bg-card p-4">
            <h2 className="text-xl font-extrabold">來貨</h2>
            {selected && variant ? (
              <div className="mt-3 space-y-3">
                <p className="font-extrabold">{selected.name}</p>
                <div className="flex flex-wrap gap-1">
                  {stockTags(variant.stock, variant.price, variant.isFoil).map((tag) => (
                    <span key={tag.label} className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tag.className)}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs font-bold text-muted-foreground">現有庫存 {variant.stock}</p>
                <label className="block text-xs font-bold text-muted-foreground">
                  來貨數量
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  單位成本
                  <input
                    inputMode="decimal"
                    value={unitCost}
                    onChange={(event) => setUnitCost(event.target.value)}
                    placeholder="每件成本"
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  售價
                  <input
                    inputMode="decimal"
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    placeholder="上架售價"
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
                  <span>今次成本</span>
                  <span className="text-lg font-extrabold text-foreground tabular-nums">{formatPrice(totalCost)}</span>
                </div>
                {error && <p className="text-sm font-bold text-red-400">{error}</p>}
                <button
                  type="button"
                  disabled={
                    pending ||
                    qty < 1 ||
                    unitCost.trim() === "" ||
                    !Number.isFinite(cost) ||
                    cost < 0 ||
                    unitPrice.trim() === "" ||
                    !Number.isFinite(Number(unitPrice)) ||
                    Number(unitPrice) < 0
                  }
                  onClick={receive}
                  className="h-14 w-full rounded-[14px] bg-pink-500 text-lg font-extrabold text-white shadow-[0_6px_0_0] shadow-pink-900 hover:bg-pink-400 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                >
                  {pending ? "入貨中…" : "入貨並扣成本"}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm font-bold text-muted-foreground">喺左邊撳一件已上架的貨，再填數量、成本和售價。</p>
            )}
          </div>

          <div className="rounded-[14px] border border-border bg-card p-4">
            <h3 className="font-extrabold">來貨紀錄</h3>
            <ul className="mt-3 space-y-3">
              {receipts.length === 0 && <li className="text-sm font-bold text-muted-foreground">未有來貨</li>}
              {receipts.map((receipt) => (
                <li key={receipt.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-extrabold">
                      {receipt.name} × {receipt.quantity}
                    </p>
                    <p className="font-bold text-muted-foreground">
                      成本 {formatPrice(receipt.quantity * receipt.unitCost)} · 售價 {formatPrice(receipt.unitPrice)}
                    </p>
                  </div>
                  <button type="button" className={dangerButton} onClick={() => undo(receipt.id)}>
                    撤銷
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PosShell>
  );
}
