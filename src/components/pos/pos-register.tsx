"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BarcodeScanButton } from "@/components/barcode-scan-button";
import { CatalogHitStrip, catalogHitManualName, catalogHitName } from "@/components/catalog/catalog-hit-strip";
import { PosShell } from "@/components/pos/pos-nav";
import { PRODUCT_TYPES } from "@/lib/constants";
import { fetchCatalogProducts } from "@/lib/fetch-catalog-products";
import { formatPrice } from "@/lib/format";
import { PAYMENT_LABELS, roundMoney, type PaymentMethod, type Sale } from "@/lib/pos-shared";
import type { CatalogSearchHit, ProductWithVariants } from "@/lib/types";
import { cn } from "@/lib/utils";

type TicketLine = {
  key: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

type ScanNote = { tone: "ok" | "warn"; text: string };

type LookupMatch = {
  product: ProductWithVariants;
  variantId: string;
};

type LookupResponse = {
  match?: LookupMatch | null;
  catalog?: CatalogSearchHit[];
  error?: string;
};

const METHODS = Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][];
const KINDS = [{ value: "", label: "全部" }, ...PRODUCT_TYPES] as const;

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-pink-400";

function lineTotal(line: TicketLine) {
  return line.quantity * line.unitPrice;
}

function saleAmount(sale: Sale) {
  return Math.max(0, sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - sale.discount);
}

function tenderedAmount(raw: string, total: number) {
  if (raw.trim() === "") return total;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function formatMoney(amount: number) {
  const rounded = roundMoney(amount);
  if (Number.isInteger(rounded)) return formatPrice(rounded);
  return new Intl.NumberFormat("zh-HK", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function PosRegister() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [matchCount, setMatchCount] = useState(0);
  const [complete, setComplete] = useState(true);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [catalogCards, setCatalogCards] = useState<CatalogSearchHit[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const payLock = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tendered, setTendered] = useState("");
  const [scanNote, setScanNote] = useState<ScanNote | null>(null);
  const [recent, setRecent] = useState<Sale[]>([]);
  const [manual, setManual] = useState({ name: "", unitPrice: "", unitCost: "" });
  const scanRef = useRef<HTMLInputElement>(null);
  const scanSeq = useRef(0);
  const actionsRef = useRef({
    confirmOpen: false,
    openConfirm: () => {},
    closeConfirm: () => {},
    checkout: () => {},
  });

  const loadRecent = async () => {
    const res = await fetch("/api/pos?period=today");
    const data = (await res.json()) as { sales: Sale[] };
    setRecent(data.sales ?? []);
  };

  useEffect(() => {
    loadRecent().catch(() => undefined);
  }, []);

  const searching = query.trim().length > 0;
  const needsFullList = searching || kind !== "";

  useEffect(() => {
    let cancelled = false;
    const requestId = window.setTimeout(() => {
      const run = async () => {
        const data = await fetchCatalogProducts(
          {
            search: query,
            type: kind || undefined,
            inStock: searching ? false : inStockOnly,
          },
          needsFullList ? { all: true } : { page, pageSize: 48 },
        );
        if (cancelled) return;
        setProducts((current) =>
          needsFullList || page === 1 ? data.products : [...current, ...data.products],
        );
        setCatalogCards(searching ? data.catalogCards : []);
        setCatalogTotal(searching ? data.catalogTotal : 0);
        setMatchCount(data.total);
        setComplete(needsFullList ? data.complete : page >= data.totalPages);
      };
      run().catch(() => {
        if (cancelled) return;
        setProducts([]);
        setCatalogCards([]);
        setCatalogTotal(0);
        setMatchCount(0);
        setComplete(true);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(requestId);
    };
  }, [query, kind, inStockOnly, page, searching, needsFullList]);

  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const total = Math.max(0, subtotal - discount);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const todayTotal = recent.filter((sale) => !sale.voided).reduce((sum, sale) => sum + saleAmount(sale), 0);

  const patchLine = (key: string, patch: Partial<TicketLine>) => {
    setLines((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const addVariant = (product: ProductWithVariants, variantId: string) => {
    const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
    if (!variant) return;
    setLines((current) => {
      const existing = current.find((line) => line.sku != null && line.sku === variant.sku);
      if (existing) {
        return current.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key: crypto.randomUUID(),
          name: product.name,
          sku: variant.sku,
          barcode: variant.barcode ?? null,
          quantity: 1,
          unitPrice: variant.price,
          unitCost: 0,
        },
      ];
    });
  };

  const addProduct = (product: ProductWithVariants) => {
    const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
    if (!variant) return;
    addVariant(product, variant.id);
  };

  const openConfirm = () => {
    if (lines.length === 0 || pending) return;
    setTendered(String(total));
    setError("");
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (pending) return;
    setConfirmOpen(false);
    scanRef.current?.focus();
  };

  const scanCode = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const seq = ++scanSeq.current;
    try {
      const res = await fetch(`/api/pos/lookup?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as LookupResponse;
      if (seq !== scanSeq.current) return;
      if (!res.ok) {
        setScanNote({ tone: "warn", text: data.error ?? "搜尋失敗，請再試一次" });
        return;
      }
      const match = data.match;
      if (!match) {
        const cards = data.catalog ?? [];
        if (cards.length === 1) {
          const card = cards[0];
          setManual((current) => ({ ...current, name: catalogHitManualName(card) }));
          setScanNote({
            tone: "warn",
            text: `卡表：${catalogHitName(card)}（${card.setCode} ${card.collectorNumber}）。沒有完全相符嘅條碼或 SKU，名稱已填到下面，請輸入售價。`,
          });
          return;
        }
        setScanNote({
          tone: "warn",
          text:
            cards.length > 1
              ? `卡表有 ${cards.length} 張相符，沒有完全相符嘅條碼或 SKU。請喺下面揀。`
              : "沒有完全相符嘅條碼、SKU 或卡號，請喺下面揀",
        });
        return;
      }
      const variant = match.product.variants.find((item) => item.id === match.variantId);
      addVariant(match.product, match.variantId);
      setQuery("");
      setScanNote({
        tone: "ok",
        text: variant && variant.stock <= 0 ? `已加入：${match.product.name}（而家無庫存）` : `已加入：${match.product.name}`,
      });
      scanRef.current?.focus();
    } catch {
      if (seq !== scanSeq.current) return;
      setScanNote({ tone: "warn", text: "搜尋失敗，請再試一次" });
    }
  };

  const addManual = () => {
    const name = manual.name.trim();
    const unitPrice = Number(manual.unitPrice);
    const unitCost = manual.unitCost === "" ? 0 : Number(manual.unitCost);
    if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        name,
        sku: null,
        barcode: null,
        quantity: 1,
        unitPrice,
        unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 0,
      },
    ]);
    setManual({ name: "", unitPrice: "", unitCost: "" });
  };

  const clearTicket = () => {
    setLines([]);
    setDiscount(0);
    setNote("");
    setError("");
    setConfirmOpen(false);
    setTendered("");
  };

  const checkout = async () => {
    if (payLock.current) return;
    const paid = tenderedAmount(tendered, total);
    if (!Number.isFinite(paid) || roundMoney(paid) + 0.001 < roundMoney(total)) {
      setError("實收少過應收");
      return;
    }
    setError("");
    payLock.current = true;
    setPending(true);
    try {
      const res = await fetch("/api/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          discount,
          note,
          items: lines.map((line) => ({
            name: line.name,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "未能入帳");
        return;
      }
      clearTicket();
      await loadRecent();
      scanRef.current?.focus();
    } catch {
      setError("未能入帳，請再試一次");
    } finally {
      payLock.current = false;
      setPending(false);
    }
  };

  const paid = tenderedAmount(tendered, total);
  const tenderedOk = Number.isFinite(paid) && roundMoney(paid) + 0.001 >= roundMoney(total);
  const changeDue = method === "CASH" && tenderedOk ? Math.max(0, roundMoney(paid - total)) : 0;

  useEffect(() => {
    actionsRef.current = {
      confirmOpen,
      openConfirm,
      closeConfirm,
      checkout: () => {
        void checkout();
      },
    };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && actionsRef.current.confirmOpen) {
        event.preventDefault();
        actionsRef.current.closeConfirm();
        return;
      }
      if (event.key !== " " || event.repeat || !actionsRef.current.confirmOpen) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (tag === "BUTTON" && target?.id !== "pos-confirm-pay") return;
      event.preventDefault();
      actionsRef.current.checkout();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const voidTicket = async (id: string) => {
    if (!window.confirm("作廢這張單？損益表不會再計算它。")) return;
    await fetch(`/api/pos/sales?id=${id}`, { method: "DELETE" });
    await loadRecent();
  };

  return (
    <PosShell current="register">
      <div className="grid h-full min-h-0 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_320px] lg:overflow-hidden">
        <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-[14px] border border-border bg-card p-4 lg:min-h-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-muted-foreground">揀貨</p>
            <p className="text-xs font-bold text-muted-foreground">撳一下就加入</p>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-bold text-muted-foreground" htmlFor="pos-scan">
              掃碼 / 搜尋
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="pos-scan"
                ref={scanRef}
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setScanNote(null);
                  setPage(1);
                }}
                onKeyDown={(event) => {
                  if (confirmOpen) return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void scanCode(query);
                    return;
                  }
                  if (event.key === " " && query.trim() === "" && lines.length > 0) {
                    event.preventDefault();
                    openConfirm();
                  }
                }}
                placeholder="條碼 / 卡名、卡號（083/101）、系列或 SKU"
                className={cn(fieldClass, "h-11 min-w-0 flex-1")}
              />
              <BarcodeScanButton
                disabled={confirmOpen}
                onDetect={(code) => {
                  if (confirmOpen) return;
                  setQuery(code);
                  setScanNote(null);
                  setPage(1);
                  void scanCode(code);
                }}
              />
            </div>
          </div>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            掃碼槍按 Enter，或者撳掃描用相機。名稱可以打完再喺下面揀。
          </p>
          {scanNote && (
            <p className={cn("mt-1 text-sm font-extrabold", scanNote.tone === "ok" ? "text-emerald-400" : "text-amber-300")} role="status">
              {scanNote.text}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {KINDS.map((item) => (
              <button
                key={item.value || "all"}
                type="button"
                onClick={() => {
                  setKind(item.value);
                  setPage(1);
                }}
                className={cn(
                  "h-8 rounded-full border px-3 text-sm font-bold",
                  kind === item.value
                    ? "border-pink-500 bg-pink-500 text-white"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => {
                setInStockOnly(event.target.checked);
                setPage(1);
              }}
              className="size-4 accent-pink-500"
            />
            淨係有貨
          </label>
          {searching && (
            <p className="mt-1 text-xs font-bold text-muted-foreground">搜尋會一併列出缺貨商品</p>
          )}
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {searching ? `找到 ${matchCount} 件` : `顯示 ${products.length} / ${matchCount}`}
            {searching && catalogTotal > 0 ? `，卡表 ${catalogTotal} 張` : ""}
            {!complete && needsFullList ? "（結果太多，請再縮小關鍵字）" : ""}
          </p>
          {searching && (
            <CatalogHitStrip
              cards={catalogCards}
              total={catalogTotal}
              hint="撳一下把官方卡名填到手動貨品，售價要自己輸入。"
              onPick={(card) => {
                setManual((current) => ({ ...current, name: catalogHitManualName(card) }));
                setScanNote({
                  tone: "warn",
                  text: `卡表：${catalogHitName(card)}（${card.setCode} ${card.collectorNumber}）。未有上架 SKU，請輸入售價後加入。`,
                });
              }}
              className="mt-3 mb-0"
            />
          )}
          <ul className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1">
            {products.map((product) => {
              const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
              const image = product.images[0];
              const stock = product.variants.reduce((sum, item) => sum + item.stock, 0);
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex h-full w-full flex-col rounded-[10px] border border-border bg-card p-2 text-left hover:border-pink-400"
                  >
                    <span className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {image ? (
                        <Image src={image.url} alt="" fill className="object-contain p-1" sizes="140px" unoptimized />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">無圖</span>
                      )}
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm font-extrabold leading-snug">{product.name}</span>
                    {(product.setCode || product.cardNumber) && (
                      <span className="text-xs font-bold text-muted-foreground">
                        {[product.setCode, product.cardNumber].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {variant?.barcode && (
                      <span className="text-[11px] font-bold text-muted-foreground">{variant.barcode}</span>
                    )}
                    <span className="mt-auto pt-1 text-sm font-extrabold text-pink-400">
                      {variant && variant.price > 0 ? formatPrice(variant.price) : "未定價"}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {stock > 0 ? `存 ${stock}` : "缺貨"}
                    </span>
                  </button>
                </li>
              );
            })}
            {products.length === 0 && (
              <li className="col-span-2 px-2 py-8 text-center text-sm font-bold text-muted-foreground">
                找不到貨品，可以用下面手動加一項。
              </li>
            )}
          </ul>
          {!needsFullList && !complete && (
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="mt-2 h-9 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:border-pink-400"
            >
              載入更多
            </button>
          )}
          <form
            className="mt-3 grid gap-2 border-t border-border pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              addManual();
            }}
          >
            <input
              value={manual.name}
              onChange={(event) => setManual({ ...manual, name: event.target.value })}
              placeholder="手動貨品名稱"
              className={fieldClass}
            />
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                inputMode="decimal"
                value={manual.unitPrice}
                onChange={(event) => setManual({ ...manual, unitPrice: event.target.value })}
                placeholder="售價"
                className={fieldClass}
              />
              <input
                inputMode="decimal"
                value={manual.unitCost}
                onChange={(event) => setManual({ ...manual, unitCost: event.target.value })}
                placeholder="成本"
                className={fieldClass}
              />
              <button
                type="submit"
                className="h-10 rounded-xl border border-border bg-muted px-3 text-sm font-extrabold text-foreground"
              >
                加入
              </button>
            </div>
          </form>
        </section>

        <section className="flex min-h-[24rem] flex-col overflow-hidden lg:min-h-0">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-extrabold">購物車</h2>
            <p className="text-sm font-bold text-muted-foreground">{itemCount} 件</p>
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-border px-4 py-12 text-center">
                <p className="text-lg font-extrabold">喺左邊撳貨</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground">揀分類，撳一下就加入購物車。冇貨品資料可以手動加。</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li key={line.key} className="rounded-[14px] border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold">{line.name}</p>
                        {line.sku && <p className="text-xs font-bold text-muted-foreground">{line.sku}</p>}
                        {line.barcode && <p className="text-xs font-bold text-muted-foreground">條碼 {line.barcode}</p>}
                      </div>
                      <p className="font-extrabold tabular-nums">{formatPrice(lineTotal(line))}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`減少 ${line.name}`}
                        onClick={() => patchLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                        className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-lg font-extrabold"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-extrabold tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`增加 ${line.name}`}
                        onClick={() => patchLine(line.key, { quantity: line.quantity + 1 })}
                        className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-lg font-extrabold"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto inline-flex h-8 items-center rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-bold text-red-400 hover:bg-red-500/20"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      >
                        刪走
                      </button>
                    </div>
                    <label className="mt-2 block text-xs font-bold text-muted-foreground">
                      售價
                      <input
                        type="number"
                        min={0}
                        value={line.unitPrice}
                        onChange={(event) =>
                          patchLine(line.key, { unitPrice: Math.max(0, Number(event.target.value) || 0) })
                        }
                        className={cn(fieldClass, "mt-1")}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <div className="flex items-end justify-between">
                <h3 className="font-extrabold">今日單據</h3>
                <p className="text-sm font-extrabold tabular-nums">{formatPrice(todayTotal)}</p>
              </div>
              <ul className="mt-2 space-y-2">
                {recent.length === 0 && <li className="text-sm font-bold text-muted-foreground">未有銷售</li>}
                {recent.map((sale) => (
                  <li key={sale.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className={sale.voided ? "font-bold text-muted-foreground line-through" : ""}>
                      <p className="font-extrabold">
                        {PAYMENT_LABELS[sale.paymentMethod]} · {formatPrice(saleAmount(sale))}
                      </p>
                      <p className="font-bold text-muted-foreground">{sale.items.map((item) => item.name).join("、")}</p>
                    </div>
                    {!sale.voided && (
                      <button
                        type="button"
                        className="inline-flex h-8 shrink-0 items-center rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-bold text-red-400 hover:bg-red-500/20"
                        onClick={() => voidTicket(sale.id)}
                      >
                        作廢
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-[14px] border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
              <span>小計</span>
              <span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <label className="mt-3 block text-xs font-bold text-muted-foreground">
              整單折扣
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))}
                className={cn(fieldClass, "mt-1")}
              />
            </label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="備註，可以留空"
              className={cn(fieldClass, "mt-2")}
            />
            <p className="mt-4 text-sm font-bold text-muted-foreground">應收</p>
            <p className="text-right text-4xl font-extrabold tabular-nums">{formatPrice(total)}</p>
            <button
              type="button"
              disabled={pending || lines.length === 0}
              onClick={openConfirm}
              className="mt-3 h-[72px] w-full rounded-[14px] bg-pink-500 text-lg font-extrabold text-white shadow-[0_6px_0_0] shadow-pink-900 hover:bg-pink-400 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              {pending ? "入帳中…" : `收款 ${formatPrice(total)}`}
            </button>
            <p className="mt-2 text-center text-xs font-bold text-muted-foreground">按收款後先揀付款方式同確認金額</p>
            <button
              type="button"
              onClick={clearTicket}
              disabled={lines.length === 0 && discount === 0 && note === ""}
              className="mt-2 h-11 w-full rounded-[10px] border border-border bg-muted text-sm font-extrabold hover:bg-muted/80 disabled:text-muted-foreground"
            >
              清除
            </button>
          </div>
        </aside>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center" role="presentation">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-pay-title"
            className="w-full max-w-xl rounded-[18px] border-2 border-pink-500 bg-card p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void checkout();
            }}
          >
            <p className="text-sm font-extrabold text-pink-300">確認收款</p>
            <h2 id="pos-pay-title" className="mt-1 text-lg font-extrabold">
              揀付款方式，核對金額後先入帳
            </h2>
            <p className="mt-4 text-sm font-bold text-muted-foreground">應收</p>
            <p className="text-5xl font-extrabold tabular-nums">{formatPrice(total)}</p>
            <p className="mt-4 text-sm font-bold text-muted-foreground">付款方式</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {METHODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(
                    "h-12 rounded-xl border text-base font-extrabold",
                    method === value
                      ? "border-pink-500 bg-pink-500 text-white"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-bold text-muted-foreground" htmlFor="pos-tendered">
              實收（留空即確認應收）
              <input
                id="pos-tendered"
                inputMode="decimal"
                value={tendered}
                onChange={(event) => setTendered(event.target.value)}
                className={cn(fieldClass, "mt-1 text-lg font-extrabold")}
              />
            </label>
            {method === "CASH" && tenderedOk && changeDue > 0 && (
              <p className="mt-2 text-sm font-extrabold text-emerald-400">找續 {formatMoney(changeDue)}</p>
            )}
            {!tenderedOk && <p className="mt-2 text-sm font-bold text-red-400">實收少過應收</p>}
            {error && <p className="mt-2 text-sm font-bold text-red-400">{error}</p>}
            <button
              id="pos-confirm-pay"
              type="submit"
              autoFocus
              disabled={pending || !tenderedOk || lines.length === 0}
              className="mt-4 h-[72px] w-full rounded-[14px] bg-pink-500 text-xl font-extrabold text-white shadow-[0_6px_0_0] shadow-pink-900 hover:bg-pink-400 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              {pending ? "入帳中…" : `確認收款 ${formatPrice(total)}`}
            </button>
            <p className="mt-2 text-center text-xs font-bold text-muted-foreground">空格鍵確認 · Esc 返回</p>
            <button
              type="button"
              onClick={closeConfirm}
              disabled={pending}
              className="mt-2 h-11 w-full rounded-[10px] border border-border bg-muted text-sm font-extrabold hover:bg-muted/80 disabled:text-muted-foreground"
            >
              返回
            </button>
          </form>
        </div>
      )}
    </PosShell>
  );
}
