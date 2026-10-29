"use client";

import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BarcodeScanButton } from "@/components/barcode-scan-button";
import { CatalogHitStrip, catalogHitManualName, catalogHitName } from "@/components/catalog/catalog-hit-strip";
import { PosShell } from "@/components/pos/pos-nav";
import styles from "@/components/pos/pos-sell.module.css";
import { posBlackBtn, posChip, posGhostBtn, posInput, posKindLabel, posLavenderBtn, posPastel, posPinkBtn, posSub, posTitle } from "@/components/pos/pos-ui";
import { PRODUCT_TYPES } from "@/lib/constants";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { DEMO_WRITE_DISCLAIMER, filterDemoCatalog } from "@/lib/demo-shop";
import { fetchCatalogProducts } from "@/lib/fetch-catalog-products";
import { formatPrice } from "@/lib/format";
import { matchPosScan } from "@/lib/pos-scan";
import {
  playPosCue,
  posSoundEnabled,
  posSoundServerSnapshot,
  primePosAudio,
  setPosSoundEnabled,
  subscribePosSound,
} from "@/lib/pos-sfx";
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

const fieldClass = cn(styles.search, posInput);

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

export function PosRegister({ demo = false }: { demo?: boolean }) {
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
  const [manual, setManual] = useState({ name: "", unitPrice: "" });
  const scanRef = useRef<HTMLInputElement>(null);
  const scanSeq = useRef(0);
  const flashTimer = useRef(0);
  const flashGen = useRef(0);
  const soundOn = useSyncExternalStore(subscribePosSound, posSoundEnabled, posSoundServerSnapshot);
  const [addedId, setAddedId] = useState<string | null>(null);
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
    if (demo) return;
    loadRecent().catch(() => undefined);
  }, [demo]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const markAdded = (id: string) => {
    window.clearTimeout(flashTimer.current);
    const gen = ++flashGen.current;
    setAddedId(null);
    window.requestAnimationFrame(() => {
      if (flashGen.current !== gen) return;
      setAddedId(id);
      flashTimer.current = window.setTimeout(() => {
        if (flashGen.current === gen) setAddedId(null);
      }, 450);
    });
  };

  const toggleSound = () => {
    const next = !soundOn;
    setPosSoundEnabled(next);
    if (next) primePosAudio();
  };

  const searching = query.trim().length > 0;
  const needsFullList = searching || kind !== "";

  const demoCatalog = useMemo(
    () =>
      demo
        ? filterDemoCatalog({
            search: searching ? query : undefined,
            type: kind || undefined,
            inStock: searching ? false : inStockOnly,
          })
        : null,
    [demo, searching, query, kind, inStockOnly],
  );
  const shelf = demoCatalog ?? products;
  const shelfCount = demoCatalog ? demoCatalog.length : matchCount;
  const shelfComplete = demoCatalog ? true : complete;
  const shelfCatalog = demoCatalog ? [] : catalogCards;
  const shelfCatalogTotal = demoCatalog ? 0 : catalogTotal;

  useEffect(() => {
    if (demo) return;
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
  }, [demo, query, kind, inStockOnly, page, searching, needsFullList]);

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
    markAdded(product.id);
    playPosCue("ok");
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
    primePosAudio();
    const seq = ++scanSeq.current;
    if (demo) {
      const match = matchPosScan(DEMO_PRODUCTS, q);
      if (seq !== scanSeq.current) return;
      if (!match) {
        playPosCue("err");
        setScanNote({ tone: "warn", text: "沒有完全相符嘅條碼、SKU 或卡號，請喺下面揀" });
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
      return;
    }
    try {
      const res = await fetch(`/api/pos/lookup?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as LookupResponse;
      if (seq !== scanSeq.current) return;
      if (!res.ok) {
        playPosCue("err");
        setScanNote({ tone: "warn", text: data.error ?? "搜尋失敗，請再試一次" });
        return;
      }
      const match = data.match;
      if (!match) {
        playPosCue("err");
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
      playPosCue("err");
      setScanNote({ tone: "warn", text: "搜尋失敗，請再試一次" });
    }
  };

  const addManual = () => {
    const name = manual.name.trim();
    const unitPrice = Number(manual.unitPrice);
    if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    playPosCue("ok");
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        name,
        sku: null,
        barcode: null,
        quantity: 1,
        unitPrice,
        unitCost: 0,
      },
    ]);
    setManual({ name: "", unitPrice: "" });
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
    primePosAudio();
    const paid = tenderedAmount(tendered, total);
    if (!Number.isFinite(paid) || roundMoney(paid) + 0.001 < roundMoney(total)) {
      setError("實收少過應收");
      playPosCue("err");
      return;
    }
    setError("");
    payLock.current = true;
    setPending(true);
    try {
      const res = await fetch(demo ? "/api/demo/pos/sales" : "/api/pos/sales", {
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
        setError(data.error ?? (demo ? DEMO_WRITE_DISCLAIMER : "未能入帳"));
        playPosCue("err");
        return;
      }
      playPosCue("ok");
      clearTicket();
      await loadRecent();
      scanRef.current?.focus();
    } catch {
      setError("未能入帳，請再試一次");
      playPosCue("err");
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
    const res = await fetch(demo ? `/api/demo/pos/sales?id=${encodeURIComponent(id)}` : `/api/pos/sales?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (demo) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? DEMO_WRITE_DISCLAIMER);
      return;
    }
    await loadRecent();
  };

  const openCamera = (code: string) => {
    if (confirmOpen) return;
    setQuery(code);
    setScanNote(null);
    setPage(1);
    void scanCode(code);
  };
  const activeSales = recent.filter((sale) => !sale.voided);

  return (
    <PosShell current="register" demo={demo} sell>
      <div className="contents" onPointerDown={() => primePosAudio()} onKeyDown={() => primePosAudio()}>
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-auto px-4 py-6 lg:px-16 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>收銀</h1>
            <p className={posSub}>搜尋或掃描商品，建立店內銷售單據。</p>
          </div>
          <BarcodeScanButton
            label="開啟掃描器"
            className={cn(posBlackBtn, "w-[190px] border-0")}
            disabled={confirmOpen}
            onDetect={openCamera}
          />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_454px]">
          <section className="flex min-w-0 flex-col gap-[18px]">
            <div className="flex flex-wrap items-center gap-3">
              <label className="min-w-[240px] flex-1" htmlFor="pos-scan">
                <span className="sr-only">掃碼 / 搜尋</span>
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
                  placeholder="搜尋商品名稱、卡號或條碼"
                  className={fieldClass}
                />
              </label>
              <BarcodeScanButton
                label="掃描條碼"
                className={cn(posLavenderBtn, "w-[160px] border-0")}
                disabled={confirmOpen}
                onDetect={openCamera}
              />
              <button
                type="button"
                aria-pressed={inStockOnly}
                onClick={() => {
                  setInStockOnly((current) => !current);
                  setPage(1);
                }}
                className={posChip(inStockOnly)}
              >
                僅顯示有庫存
              </button>
              <button
                type="button"
                className={cn(styles.chip, posChip(soundOn), "gap-1")}
                aria-pressed={soundOn}
                data-sound={soundOn ? "on" : "off"}
                onClick={toggleSound}
              >
                {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
                掃碼有聲
              </button>
            </div>
            <p className="text-[13px] text-[#706c68]">掃碼槍按 Enter。搜尋時會一併列出缺貨商品。撳商品卡加入購物車。</p>
            {scanNote && (
              <p className={cn("text-[14px] font-bold", scanNote.tone === "ok" ? "text-[#3f6b16]" : "text-[#9a5b12]")} role="status">
                {scanNote.text}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {KINDS.map((item) => (
                <button
                  key={item.value || "all"}
                  type="button"
                  onClick={() => {
                    setKind(item.value);
                    setPage(1);
                  }}
                  className={cn(styles.chip, posChip(kind === item.value), kind === item.value && styles.on)}
                >
                  {posKindLabel(item.value, item.label)}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-[#706c68]">
              {searching ? `找到 ${shelfCount} 件` : `顯示 ${shelf.length} / ${shelfCount}`}
              {searching && shelfCatalogTotal > 0 ? `，卡表 ${shelfCatalogTotal} 張` : ""}
              {!shelfComplete && needsFullList ? "（結果太多，請再縮小關鍵字）" : ""}
            </p>
            {searching && (
              <CatalogHitStrip
                cards={shelfCatalog}
                total={shelfCatalogTotal}
                hint="撳一下把官方卡名填到手動貨品，售價要自己輸入。"
                onPick={(card) => {
                  playPosCue("ok");
                  setManual((current) => ({ ...current, name: catalogHitManualName(card) }));
                  setScanNote({
                    tone: "warn",
                    text: `卡表：${catalogHitName(card)}（${card.setCode} ${card.collectorNumber}）。未有上架 SKU，請輸入售價後加入。`,
                  });
                }}
                className="mb-0"
              />
            )}
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shelf.map((product, index) => {
                const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
                const image = product.images[0];
                const stock = product.variants.reduce((sum, item) => sum + item.stock, 0);
                const meta = [
                  product.setCode,
                  product.rarityTier || product.rarity || product.cardNumber,
                  `庫存 ${stock}`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      data-added={addedId === product.id ? "true" : undefined}
                      data-oos={stock <= 0 ? "true" : undefined}
                      className={cn(
                        styles.tile,
                        "flex h-full w-full flex-col gap-2 rounded-[20px] border border-[rgba(222,214,203,0.7)] p-4 text-left shadow-[0_10px_14px_rgba(74,44,22,0.1)]",
                        stock <= 0 && styles.oos,
                        addedId === product.id && styles.added,
                      )}
                      style={{ backgroundColor: posPastel(index) }}
                    >
                      <span className="relative flex h-[118px] items-center justify-center overflow-hidden rounded-[14px] bg-[#faf8f3]">
                        {image ? (
                          <Image src={image.url} alt="" fill className="object-contain p-2" sizes="236px" unoptimized />
                        ) : (
                          <span className="text-[26px] font-bold text-[#706c68]">TCG</span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-[15px] font-bold text-[#171514]">{product.name}</span>
                      <span className="text-[13px] text-[#706c68]">{meta}</span>
                      <span className="text-[18px] font-bold text-[#171514]">
                        {variant && variant.price > 0 ? formatPrice(variant.price) : "未定價"}
                      </span>
                    </button>
                  </li>
                );
              })}
              {shelf.length === 0 && (
                <li className="px-2 py-8 text-[14px] text-[#706c68] sm:col-span-2 xl:col-span-3">
                  找不到貨品，可以用下面手動加一項。
                </li>
              )}
            </ul>
            {!needsFullList && !shelfComplete && (
              <button type="button" onClick={() => setPage((current) => current + 1)} className={posGhostBtn}>
                載入更多
              </button>
            )}
            <form
              className="flex flex-col gap-3 rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white p-5 shadow-[0_10px_14px_rgba(74,44,22,0.1)]"
              onSubmit={(event) => {
                event.preventDefault();
                addManual();
              }}
            >
              <p className="text-[20px] font-bold text-[#171514]">手動項目</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[220px] flex-1">
                  <span className="mb-1.5 block text-[13px] font-bold">項目名稱</span>
                  <input
                    value={manual.name}
                    onChange={(event) => setManual({ ...manual, name: event.target.value })}
                    placeholder="輸入名稱"
                    className={fieldClass}
                  />
                </label>
                <label className="w-[180px]">
                  <span className="mb-1.5 block text-[13px] font-bold">金額</span>
                  <input
                    inputMode="decimal"
                    value={manual.unitPrice}
                    onChange={(event) => setManual({ ...manual, unitPrice: event.target.value })}
                    placeholder="HK$ 0"
                    aria-label="金額"
                    className={fieldClass}
                  />
                </label>
                <button type="submit" className={cn(styles.pop, posBlackBtn, "w-[150px] border-0")}>
                  加入
                </button>
              </div>
            </form>
          </section>

          <aside className="flex flex-col gap-3.5 rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white p-[22px] shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
            <div className="flex items-start justify-between">
              <h2 className="text-[25px] font-bold text-[#171514]">購物車</h2>
              <span className="inline-flex items-center rounded-full bg-[#090909] px-3.5 py-2 text-[14px] font-bold text-white">
                {itemCount} 件
              </span>
            </div>
            {lines.length === 0 ? (
              <p className="rounded-[12px] bg-[#faf8f3] px-3 py-6 text-center text-[14px] text-[#706c68]">
                撳左邊商品加入購物車。沒有貨品資料可以手動加。
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((line) => (
                  <li key={line.key} className="rounded-[12px] bg-[#faf8f3] p-3">
                    <div className="flex items-start justify-between gap-3 text-[15px] font-bold text-[#171514]">
                      <p className="min-w-0">
                        {line.name}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                      </p>
                      <p className="shrink-0 tabular-nums">{formatPrice(lineTotal(line))}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        aria-label={`減少 ${line.name}`}
                        onClick={() => patchLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                        className={cn(styles.pop, "flex size-8 items-center justify-center rounded-full border border-[#ded6cb] text-[16px] font-bold")}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-[14px] font-bold tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`增加 ${line.name}`}
                        onClick={() => patchLine(line.key, { quantity: line.quantity + 1 })}
                        className={cn(styles.pop, "flex size-8 items-center justify-center rounded-full border border-[#ded6cb] text-[16px] font-bold")}
                      >
                        +
                      </button>
                      <label className="ml-1 text-[12px] font-bold text-[#706c68]">
                        售價
                        <input
                          type="number"
                          min={0}
                          aria-label={`${line.name} 售價`}
                          value={line.unitPrice}
                          onChange={(event) =>
                            patchLine(line.key, { unitPrice: Math.max(0, Number(event.target.value) || 0) })
                          }
                          className={cn(styles.search, "mt-1 h-8 w-20 rounded-[10px] border border-[#ded6cb] bg-white px-2 text-right text-[14px] font-bold text-[#171514] outline-none")}
                        />
                      </label>
                      <button
                        type="button"
                        className="ml-auto text-[12px] font-bold text-[#9a3412]"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      >
                        刪走
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold">折扣</span>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))}
                placeholder="HK$ 0"
                className={fieldClass}
              />
            </label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="備註，可以留空"
              aria-label="備註"
              className={fieldClass}
            />
            <div className="h-px bg-[#ded6cb]" />
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#706c68]">小計</span>
              <span className="font-bold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#706c68]">折扣</span>
              <span className="font-bold tabular-nums">{formatPrice(discount)}</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-[18px]">應付金額</span>
              <span className="text-[24px] tabular-nums">{formatPrice(total)}</span>
            </div>
            <button
              type="button"
              disabled={pending || lines.length === 0}
              onClick={openConfirm}
              className={cn(styles.key, posPinkBtn, "w-full")}
            >
              {pending ? "入帳中…" : "收款"}
            </button>
            <p className="text-center text-[12px] text-[#706c68]">
              {demo ? DEMO_WRITE_DISCLAIMER : "按收款後先揀付款方式同確認金額"}
            </p>
            <button
              type="button"
              onClick={clearTicket}
              disabled={lines.length === 0 && discount === 0 && note === ""}
              className={cn(styles.pop, posGhostBtn, "w-full")}
            >
              清空購物車
            </button>
            <div className="rounded-[14px] bg-[#ddeb9f] p-3.5 text-[#171514]">
              <p className="text-[14px] font-bold">今日收據</p>
              <p className="mt-1 text-[20px] font-bold">
                {activeSales.length} 張 · {formatPrice(todayTotal)}
              </p>
            </div>
            {recent.length > 0 && (
              <ul className="space-y-2">
                {recent.map((sale) => (
                  <li key={sale.id} className="flex items-start justify-between gap-2 text-[13px]">
                    <div className={sale.voided ? "text-[#706c68] line-through" : "text-[#171514]"}>
                      <p className="font-bold">
                        {PAYMENT_LABELS[sale.paymentMethod]} · {formatPrice(saleAmount(sale))}
                      </p>
                      <p className="text-[#706c68]">{sale.items.map((item) => item.name).join("、")}</p>
                    </div>
                    {!sale.voided && (
                      <button type="button" className="shrink-0 font-bold text-[#9a3412]" onClick={() => voidTicket(sale.id)}>
                        作廢
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center" role="presentation">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-pay-title"
            className="w-full max-w-xl rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white p-5 text-[#171514] shadow-[0_10px_14px_rgba(74,44,22,0.1)]"
            onSubmit={(event) => {
              event.preventDefault();
              void checkout();
            }}
          >
            <p className="text-[14px] font-bold text-[#e84e9e]">確認收款</p>
            <h2 id="pos-pay-title" className="mt-1 text-[20px] font-bold">
              揀付款方式，核對金額後先入帳
            </h2>
            <p className="mt-4 text-[14px] text-[#706c68]">應收</p>
            <p className="text-[40px] font-bold tabular-nums">{formatPrice(total)}</p>
            <p className="mt-4 text-[14px] text-[#706c68]">付款方式</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {METHODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(styles.chip, posChip(method === value), "h-12 justify-center text-[15px]", method === value && styles.on)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-[14px] font-bold" htmlFor="pos-tendered">
              實收（留空即確認應收）
              <input
                id="pos-tendered"
                inputMode="decimal"
                value={tendered}
                onChange={(event) => setTendered(event.target.value)}
                className={cn(fieldClass, "mt-1 text-[18px] font-bold")}
              />
            </label>
            {method === "CASH" && tenderedOk && changeDue > 0 && (
              <p className="mt-2 text-[14px] font-bold text-[#3f6b16]">找續 {formatMoney(changeDue)}</p>
            )}
            {!tenderedOk && <p className="mt-2 text-[14px] font-bold text-[#9a3412]">實收少過應收</p>}
            {error && <p className="mt-2 text-[14px] font-bold text-[#9a3412]">{error}</p>}
            <button
              id="pos-confirm-pay"
              type="submit"
              autoFocus
              disabled={pending || !tenderedOk || lines.length === 0}
              className={cn(styles.key, posPinkBtn, "mt-4 h-14 w-full text-[18px]")}
            >
              {pending ? "入帳中…" : `確認收款 ${formatPrice(total)}`}
            </button>
            <p className="mt-2 text-center text-[12px] text-[#706c68]">空格鍵確認 · Esc 返回</p>
            <button type="button" onClick={closeConfirm} disabled={pending} className={cn(styles.pop, posGhostBtn, "mt-2 w-full")}>
              返回
            </button>
          </form>
        </div>
      )}
      </div>
    </PosShell>
  );
}
