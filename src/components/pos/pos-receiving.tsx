"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeScanButton } from "@/components/barcode-scan-button";
import { CatalogHitStrip } from "@/components/catalog/catalog-hit-strip";
import { PosShell } from "@/components/pos/pos-nav";
import {
  downloadCsv,
  posBlackBtn,
  posChip,
  posGhostBtn,
  posInput,
  posKindLabel,
  posSelectClass,
  posSub,
  posTitle,
  posWhen,
} from "@/components/pos/pos-ui";
import { SET_SERIES_CODES } from "@/lib/card-taxonomy";
import { PRODUCT_TYPES } from "@/lib/constants";
import { fetchCatalogProducts } from "@/lib/fetch-catalog-products";
import { formatPrice } from "@/lib/format";
import type { Receipt } from "@/lib/pos-shared";
import type { CatalogSearchHit, ProductSort, ProductWithVariants } from "@/lib/types";
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

const fieldClass = posInput;

function stockStatus(stock: number, price: number) {
  if (price <= 0 && stock <= 0) return "缺貨";
  if (stock <= 0) return "缺貨";
  if (stock <= 2) return "低庫存";
  if (price <= 0) return "未定價";
  return "正常";
}

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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [complete, setComplete] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [catalogCards, setCatalogCards] = useState<CatalogSearchHit[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [inboundOpen, setInboundOpen] = useState(false);
  const quantityRef = useRef<HTMLInputElement>(null);

  const searching = query.trim().length > 0;
  const needsFullList =
    searching ||
    kind !== "" ||
    setCodes.length > 0 ||
    stockFilter !== "all" ||
    sort === "priceAsc" ||
    sort === "priceDesc";

  const loadReceipts = async () => {
    const res = await fetch("/api/pos/receipts");
    const data = (await res.json()) as { receipts: Receipt[] };
    setReceipts(data.receipts ?? []);
  };

  useEffect(() => {
    loadReceipts().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const run = async () => {
        const data = await fetchCatalogProducts(
          {
            search: query,
            type: kind || undefined,
            setCodes,
            sort,
          },
          needsFullList ? { all: true } : { page, pageSize: 48 },
        );
        if (cancelled) return;
        setProducts((current) =>
          needsFullList || page === 1 ? data.products : [...current, ...data.products],
        );
        setCatalogCards(searching ? data.catalogCards : []);
        setCatalogTotal(searching ? data.catalogTotal : 0);
        setTotal(data.total);
        setComplete(needsFullList ? data.complete : page >= data.totalPages);
      };
      run().catch(() => {
        if (cancelled) return;
        setProducts([]);
        setCatalogCards([]);
        setCatalogTotal(0);
        setTotal(0);
        setComplete(true);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, searching, sort, kind, setCodes, page, needsFullList, refreshKey]);

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

  const openInbound = () => {
    setInboundOpen(true);
    setError("");
    window.setTimeout(() => {
      document.getElementById("stock-inbound")?.scrollIntoView({ block: "nearest" });
      if (selectedVariantId) quantityRef.current?.focus();
    }, 0);
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
      setPage(1);
      setRefreshKey((current) => current + 1);
      await loadReceipts();
    } catch {
      setError("未能入貨，請再試一次");
    } finally {
      setPending(false);
    }
  };

  const undo = async (id: string) => {
    if (!window.confirm("撤銷這筆進貨？庫存會扣回，進貨成本也不再計入損益。")) return;
    await fetch(`/api/pos/receipts?id=${id}`, { method: "DELETE" });
    setPage(1);
    setRefreshKey((current) => current + 1);
    await loadReceipts();
  };

  const scanIntoReceiving = async (code: string) => {
    setQuery(code);
    setPage(1);
    try {
      const res = await fetch(`/api/pos/lookup?q=${encodeURIComponent(code)}`);
      const data = (await res.json()) as {
        match?: { product: ProductWithVariants; variantId: string } | null;
      };
      const match = data.match;
      if (!match) {
        setError("沒有完全相符嘅條碼或 SKU。卡表如果有這張，請先在後台上架，再入貨。");
        return;
      }
      setProducts((current) =>
        current.some((product) => product.id === match.product.id) ? current : [match.product, ...current],
      );
      choose(match.product, match.variantId);
      setInboundOpen(true);
    } catch {
      setError("搜尋失敗，請再試一次");
    }
  };

  const toggleSet = (value: string) => {
    setPage(1);
    setSetCodes((current) =>
      current.includes(value) ? current.filter((code) => code !== value) : [...current, value],
    );
  };

  const rows = products
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

  const exportRows = () => {
    downloadCsv("pos-inventory.csv", [
      ["商品", "系列 / 類型", "售價", "庫存", "狀態"],
      ...rows.map(({ product, item }) => [
        product.name,
        [product.setCode ? labelFor("SET_CODE", product.setCode) : "", posKindLabel(product.type, product.type)].filter(Boolean).join(" · "),
        item.price > 0 ? String(item.price) : "",
        String(item.stock),
        stockStatus(item.stock, item.price),
      ]),
    ]);
  };

  return (
    <PosShell current="receiving">
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-auto px-4 py-6 lg:px-16 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>倉存</h1>
            <p className={posSub}>搜尋商品、收貨入庫並查看最近收貨紀錄。</p>
          </div>
          <BarcodeScanButton label="開始掃描" className={cn(posBlackBtn, "w-[160px] border-0")} onDetect={(code) => void scanIntoReceiving(code)} />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="搜尋商品、卡號或條碼"
                aria-label="搜尋倉存"
                className={cn(fieldClass, "min-w-[240px] max-w-[480px] flex-1")}
              />
              <select
                value={sort}
                aria-label="排序"
                onChange={(event) => {
                  setSort(event.target.value as ProductSort);
                  setPage(1);
                }}
                className={posSelectClass()}
              >
                <option value="newest">最新更新</option>
                <option value="setCode">系列編號</option>
                <option value="rarityTier">稀有度</option>
                <option value="priceAsc">價格由低至高</option>
                <option value="priceDesc">價格由高至低</option>
              </select>
              <select
                value={kind}
                aria-label="類型"
                onChange={(event) => {
                  setKind(event.target.value);
                  setPage(1);
                }}
                className={posSelectClass()}
              >
                {KINDS.map((item) => (
                  <option key={item.value || "all-kind"} value={item.value}>
                    {item.value ? posKindLabel(item.value, item.label) : "全部類型"}
                  </option>
                ))}
              </select>
              <select
                value={stockFilter}
                aria-label="狀態"
                onChange={(event) => {
                  setStockFilter(event.target.value as StockFilter);
                  setPage(1);
                }}
                className={posSelectClass()}
              >
                {STOCK_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value === "all" ? "全部狀態" : item.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={exportRows} className={posGhostBtn}>
                匯出倉存
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSetCodes([]);
                  setPage(1);
                }}
                className={posChip(setCodes.length === 0)}
              >
                全部
              </button>
              {series.map((item) => (
                <button key={item.value} type="button" onClick={() => toggleSet(item.value)} className={posChip(setCodes.includes(item.value))}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-[#706c68]">
              {searching || setCodes.length > 0 || kind || stockFilter !== "all"
                ? `找到 ${rows.length} 件`
                : `顯示 ${products.length} / ${total}`}
              {!complete && needsFullList ? "（結果太多，請再縮小關鍵字）" : ""}
            </p>
            {searching && (
              <CatalogHitStrip cards={catalogCards} total={catalogTotal} hint="只供對名。入貨要揀已上架的 SKU 或條碼。" />
            )}
            <div className="overflow-hidden rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-[#faf8f3] text-[13px] text-[#706c68]">
                  <tr>
                    <th className="px-4 py-3 font-bold">商品</th>
                    <th className="px-4 py-3 font-bold">系列 / 類型</th>
                    <th className="px-4 py-3 font-bold">售價</th>
                    <th className="px-4 py-3 font-bold">庫存</th>
                    <th className="px-4 py-3 font-bold">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ product, item }) => {
                    const active = item.id === selectedVariantId;
                    const seriesLabel = product.setCode ? labelFor("SET_CODE", product.setCode) : "";
                    return (
                      <tr
                        key={item.id}
                        className={cn("cursor-pointer border-t border-[#ded6cb]", active ? "bg-[#e8dfff]" : "hover:bg-[#faf8f3]")}
                        onClick={() => choose(product, item.id)}
                      >
                        <td className="px-4 py-3 font-bold text-[#171514]">
                          {product.name}
                          {product.variants.length > 1 ? ` · ${item.condition}` : ""}
                        </td>
                        <td className="px-4 py-3 text-[#706c68]">
                          {[seriesLabel, posKindLabel(product.type, product.type)].filter(Boolean).join(" · ")}
                        </td>
                        <td className="px-4 py-3 font-bold">{item.price > 0 ? formatPrice(item.price) : "未定價"}</td>
                        <td className="px-4 py-3">{item.stock}</td>
                        <td className="px-4 py-3">{stockStatus(item.stock, item.price)}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[#706c68]">
                        {products.length === 0 ? "未有上架貨品。請先在後台商品名單加入。" : "沒有符合條件的貨品"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!needsFullList && !complete && (
              <button type="button" onClick={() => setPage((current) => current + 1)} className={posGhostBtn}>
                載入更多
              </button>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <div id="stock-inbound" data-open={inboundOpen ? "true" : "false"} className="flex flex-col gap-3 rounded-[20px] bg-[#e8dfff] p-5 text-[#171514]">
              <div>
                <p className="text-[20px] font-bold">收貨明細</p>
                <p className="mt-1 text-[15px] font-bold">{selected ? selected.name : "揀一件商品"}</p>
                <p className="text-[13px] text-[#706c68]">
                  {variant
                    ? `目前庫存 ${variant.stock} · 最近更新今天`
                    : "從左邊表格揀已上架貨品，再填數量、成本同售價。"}
                </p>
              </div>
              {selected && variant ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    {stockTags(variant.stock, variant.price, variant.isFoil).map((tag) => (
                      <span key={tag.label} className={cn("rounded-full bg-white/70 px-2 py-0.5 text-[12px] font-bold", tag.className)}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <label className="block text-[13px] font-bold">
                    收貨數量
                    <input
                      ref={quantityRef}
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className={cn(fieldClass, "mt-1.5")}
                    />
                  </label>
                  <label className="block text-[13px] font-bold">
                    單位成本
                    <input
                      inputMode="decimal"
                      value={unitCost}
                      onChange={(event) => setUnitCost(event.target.value)}
                      placeholder="每件成本"
                      className={cn(fieldClass, "mt-1.5")}
                    />
                  </label>
                  <label className="block text-[13px] font-bold">
                    售價
                    <input
                      inputMode="decimal"
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(event.target.value)}
                      placeholder="上架售價"
                      className={cn(fieldClass, "mt-1.5")}
                    />
                  </label>
                  <div className="flex items-center justify-between text-[14px]">
                    <span>今次成本</span>
                    <span className="text-[18px] font-bold tabular-nums">{formatPrice(totalCost)}</span>
                  </div>
                  {error && <p className="text-[14px] font-bold text-[#9a3412]">{error}</p>}
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
                    className={cn(posBlackBtn, "w-full")}
                  >
                    {pending ? "入貨中…" : "確認入庫"}
                  </button>
                </>
              ) : (
                <>
                  {error && <p className="text-[14px] font-bold text-[#9a3412]">{error}</p>}
                  <button type="button" onClick={openInbound} className={cn(posBlackBtn, "w-full")}>
                    確認入庫
                  </button>
                </>
              )}
            </div>

            <div className="rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white p-5 shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
              <h3 className="text-[18px] font-bold">最近收貨紀錄</h3>
              <ul className="mt-3 divide-y divide-[#ded6cb]">
                {receipts.length === 0 && <li className="py-3 text-[14px] text-[#706c68]">未有進貨</li>}
                {receipts.map((receipt) => (
                  <li key={receipt.id} className="flex items-center justify-between gap-3 py-3 text-[14px]">
                    <span className="text-[#706c68]">{posWhen(receipt.createdAt)}</span>
                    <span className="min-w-0 flex-1 text-right font-bold">
                      {receipt.name} +{receipt.quantity}
                    </span>
                    <button type="button" className="shrink-0 font-bold text-[#9a3412]" onClick={() => undo(receipt.id)}>
                      撤銷
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </PosShell>
  );
}
