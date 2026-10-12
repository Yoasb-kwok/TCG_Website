"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BarcodeScanButton } from "@/components/barcode-scan-button";
import { CatalogHitStrip, catalogHitName } from "@/components/catalog/catalog-hit-strip";
import { PosShell } from "@/components/pos/pos-nav";
import { fetchCatalogProducts } from "@/lib/fetch-catalog-products";
import { formatDate, formatPrice } from "@/lib/format";
import { buybackDayTotal } from "@/lib/pos-buyback";
import type { Buyback } from "@/lib/pos-shared";
import type { CatalogSearchHit, ProductWithVariants } from "@/lib/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-pink-400";

const dangerButton =
  "inline-flex h-8 shrink-0 items-center rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-bold text-red-400 hover:bg-red-500/20";

type Selection =
  | { kind: "variant"; product: ProductWithVariants; variantId: string }
  | { kind: "catalog"; card: CatalogSearchHit };

type BuybackResponse = {
  error?: string;
  stock?: number | null;
  createdListing?: boolean;
  needsSellPrice?: boolean;
};

function successCopy(data: BuybackResponse) {
  const stock =
    typeof data.stock === "number" ? `庫存現為 ${data.stock}。` : "示範模式未寫入庫存。";
  if (data.createdListing) {
    return `已收卡。這張未上架，已新建庫存，售價未定。${stock}請到商品後台填售價。`;
  }
  if (data.needsSellPrice) return `已收卡。${stock}售價未定，請到商品後台填售價。`;
  return `已收卡。${stock}`;
}

export function PosBuyback() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [complete, setComplete] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [catalogCards, setCatalogCards] = useState<CatalogSearchHit[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitBuyPrice, setUnitBuyPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pokemonId, setPokemonId] = useState("");
  const [note, setNote] = useState("");
  const [buybacks, setBuybacks] = useState<Buyback[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const searching = query.trim().length > 0;

  const loadBuybacks = async () => {
    const res = await fetch("/api/pos/buyback");
    const data = (await res.json()) as { buybacks?: Buyback[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "未能讀取收卡紀錄");
      return;
    }
    setBuybacks(data.buybacks ?? []);
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pos/buyback", { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json()) as { buybacks?: Buyback[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "未能讀取收卡紀錄");
          return;
        }
        setBuybacks(data.buybacks ?? []);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const run = async () => {
        const data = await fetchCatalogProducts(
          { search: query },
          searching ? { all: true } : { page, pageSize: 48 },
        );
        if (cancelled) return;
        setProducts((current) => (searching || page === 1 ? data.products : [...current, ...data.products]));
        setCatalogCards(searching ? data.catalogCards : []);
        setCatalogTotal(searching ? data.catalogTotal : 0);
        setTotal(data.total);
        setComplete(searching ? data.complete : page >= data.totalPages);
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
  }, [query, searching, page, refreshKey]);

  const selectedProduct = selection?.kind === "variant" ? selection.product : null;
  const selectedVariant =
    selection?.kind === "variant"
      ? (selection.product.variants.find((entry) => entry.id === selection.variantId) ?? null)
      : null;
  const qty = Number(quantity);
  const price = Number(unitBuyPrice);
  const lineTotal = Number.isInteger(qty) && qty > 0 && Number.isFinite(price) && price > 0 ? qty * price : 0;

  const chooseVariant = (product: ProductWithVariants, variantId: string) => {
    setSelection({ kind: "variant", product, variantId });
    setQuantity("1");
    setUnitBuyPrice("");
    setError("");
    setMessage("");
  };

  const chooseCatalog = (card: CatalogSearchHit) => {
    setSelection({ kind: "catalog", card });
    setQuantity("1");
    setUnitBuyPrice("");
    setError("");
    setMessage("");
  };

  const submit = async () => {
    if (!selection) return;
    setError("");
    setMessage("");
    setPending(true);
    try {
      const res = await fetch("/api/pos/buyback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selection.kind === "variant" ? selection.variantId : null,
          catalogCardId: selection.kind === "catalog" ? selection.card.id : null,
          quantity: qty,
          unitBuyPrice: price,
          customerName,
          customerPhone,
          pokemonId,
          note,
        }),
      });
      const data = (await res.json()) as BuybackResponse;
      if (!res.ok) {
        setError(data.error ?? "未能收卡");
        return;
      }
      setMessage(successCopy(data));
      setQuantity("1");
      setUnitBuyPrice("");
      setNote("");
      setSelection(null);
      setPage(1);
      setRefreshKey((current) => current + 1);
      await loadBuybacks();
    } catch {
      setError("未能收卡，請再試一次");
    } finally {
      setPending(false);
    }
  };

  const undo = async (id: string) => {
    if (!window.confirm("撤銷這筆收卡？庫存會扣回，收購成本也不再計入損益。")) return;
    const res = await fetch(`/api/pos/buyback?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "未能撤銷");
      return;
    }
    setPage(1);
    setRefreshKey((current) => current + 1);
    await loadBuybacks();
  };

  const scanIntoBuyback = async (code: string) => {
    setQuery(code);
    setPage(1);
    try {
      const res = await fetch(`/api/pos/lookup?q=${encodeURIComponent(code)}`);
      const data = (await res.json()) as {
        match?: { product: ProductWithVariants; variantId: string } | null;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "搜尋失敗，請再試一次");
        return;
      }
      const match = data.match;
      if (!match) {
        setError("沒有完全相符嘅條碼或 SKU。可以喺卡表結果揀這張卡。");
        return;
      }
      setProducts((current) =>
        current.some((product) => product.id === match.product.id) ? current : [match.product, ...current],
      );
      chooseVariant(match.product, match.variantId);
    } catch {
      setError("搜尋失敗，請再試一次");
    }
  };

  const rows = products.flatMap((product) => product.variants.map((item) => ({ product, item })));
  const catalogCard = selection?.kind === "catalog" ? selection.card : null;
  const selectionName = selectedProduct?.name ?? (catalogCard ? catalogHitName(catalogCard) : "");

  return (
    <PosShell current="buyback">
      <div className="grid h-full min-h-0 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card p-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="條碼 / 卡名、卡號（083/101 或 M6a 001）、系列或 SKU"
              aria-label="搜尋收卡"
              className={cn(fieldClass, "h-11 min-w-0 flex-1")}
            />
            <BarcodeScanButton onDetect={(code) => void scanIntoBuyback(code)} />
          </div>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {searching ? `找到 ${rows.length} 件已上架` : `顯示 ${products.length} / ${total}`}
            {searching && !complete ? "（結果太多，請再縮小關鍵字）" : ""}
          </p>
          {searching && (
            <CatalogHitStrip
              cards={catalogCards}
              total={catalogTotal}
              hint="撳卡表可以直接收卡。未上架的卡會新建庫存，售價留空。"
              onPick={chooseCatalog}
              className="mt-3"
            />
          )}
          <ul
            className="mt-3 grid min-h-0 flex-1 content-start justify-start gap-2 overflow-auto pr-1"
            style={{ gridTemplateColumns: "repeat(auto-fill, 7.25rem)" }}
          >
            {rows.map(({ product, item }) => {
              const image = product.images[0];
              const active = selection?.kind === "variant" && selection.variantId === item.id;
              const label = product.variants.length > 1 ? `${product.name} · ${item.condition}` : product.name;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => chooseVariant(product, item.id)}
                    className={cn(
                      "flex h-full w-[7.25rem] flex-col rounded-[10px] border bg-transparent p-1 text-left",
                      active ? "border-pink-500" : "border-transparent hover:border-pink-400",
                    )}
                  >
                    <span className="relative block aspect-[63/88] overflow-hidden rounded-md">
                      {image ? (
                        <Image src={image.url} alt="" fill className="object-cover" sizes="116px" unoptimized />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                          無圖
                        </span>
                      )}
                    </span>
                    <span className="mt-1 line-clamp-2 text-sm font-extrabold leading-snug">{label}</span>
                    {product.cardNumber && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {[product.setCode, product.cardNumber].filter(Boolean).join(" ")}
                      </span>
                    )}
                    <span className="mt-auto pt-1 text-xs font-bold text-muted-foreground">
                      存 {item.stock}
                      {item.price > 0 ? ` · ${formatPrice(item.price)}` : " · 未定價"}
                    </span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="col-span-full px-2 py-8 text-center text-sm font-bold text-muted-foreground">
                {searching ? "沒有已上架貨品。可以揀上面的卡表。" : "未有上架貨品。搜尋卡名或卡號就可以從卡表收卡。"}
              </li>
            )}
          </ul>
          {!searching && !complete && (
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="mt-2 h-9 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:border-pink-400"
            >
              載入更多
            </button>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-[14px] border border-border bg-card p-4">
            <h2 className="text-xl font-extrabold">收卡</h2>
            {selection ? (
              <div className="mt-3 space-y-3">
                <p className="font-extrabold">{selectionName}</p>
                {selectedVariant && (
                  <p className="text-xs font-bold text-muted-foreground">
                    {selectedVariant.condition}
                    {selectedVariant.isFoil ? " · 閃" : ""} · 現有庫存 {selectedVariant.stock}
                    {selectedVariant.price > 0 ? ` · 售價 ${formatPrice(selectedVariant.price)}` : " · 未定價"}
                  </p>
                )}
                {catalogCard && (
                  <p className="text-xs font-bold text-muted-foreground">
                    {[catalogCard.setCode, catalogCard.collectorNumber].filter(Boolean).join(" ")}
                    。如果店內已有這張卡，庫存會加到 Near Mint。要指定品相，請直接揀已上架的貨。
                  </p>
                )}
                <p className="text-xs font-bold text-muted-foreground">收購價是店方付出的成本，不會改現有售價。</p>
                <label className="block text-xs font-bold text-muted-foreground">
                  數量
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  收購價（HKD）
                  <input
                    inputMode="decimal"
                    value={unitBuyPrice}
                    onChange={(event) => setUnitBuyPrice(event.target.value)}
                    placeholder="每張收購價"
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  客人姓名（可留空）
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  電話（可留空）
                  <input
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="8 位香港號碼"
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  Pokémon ID（可留空）
                  <input
                    value={pokemonId}
                    onChange={(event) => setPokemonId(event.target.value)}
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  備註（可留空）
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={cn(fieldClass, "mt-1")}
                  />
                </label>
                <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
                  <span>今次收購</span>
                  <span className="text-lg font-extrabold text-foreground tabular-nums">{formatPrice(lineTotal)}</span>
                </div>
                {error && <p className="text-sm font-bold text-red-400">{error}</p>}
                {message && <p className="text-sm font-bold text-foreground">{message}</p>}
                <button
                  type="button"
                  disabled={
                    pending ||
                    !Number.isInteger(qty) ||
                    qty < 1 ||
                    unitBuyPrice.trim() === "" ||
                    !Number.isFinite(price) ||
                    price <= 0
                  }
                  onClick={() => void submit()}
                  className="h-14 w-full rounded-[14px] bg-pink-500 text-lg font-extrabold text-white shadow-[0_6px_0_0] shadow-pink-900 hover:bg-pink-400 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                >
                  {pending ? "入帳中…" : "收卡並入庫"}
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm font-bold text-muted-foreground">
                  搜尋後撳一件已上架的貨，或者撳卡表的卡。再填數量同收購價。
                </p>
                {error && <p className="text-sm font-bold text-red-400">{error}</p>}
                {message && <p className="text-sm font-bold text-foreground">{message}</p>}
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-extrabold">今日收卡</h3>
              <p className="text-sm font-extrabold tabular-nums">{formatPrice(buybackDayTotal(buybacks))}</p>
            </div>
            <p className="mt-1 text-xs font-bold text-muted-foreground">香港時間今日。已撤銷唔計入合計。</p>
            <ul className="mt-3 space-y-3">
              {buybacks.length === 0 && <li className="text-sm font-bold text-muted-foreground">今日未有收卡</li>}
              {buybacks.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className={cn("font-extrabold", row.voided && "text-muted-foreground line-through")}>
                      {row.name} × {row.quantity}
                    </p>
                    <p className="font-bold text-muted-foreground">
                      {formatDate(row.createdAt)} · {row.voided ? "已撤銷" : `收購 ${formatPrice(row.totalAmount)}`}
                    </p>
                    {(row.customerName || row.customerPhone || row.pokemonId) && (
                      <p className="font-bold text-muted-foreground">
                        {[row.customerName, row.customerPhone, row.pokemonId && `Pokémon ID ${row.pokemonId}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  {!row.voided && (
                    <button type="button" className={dangerButton} onClick={() => void undo(row.id)}>
                      撤銷
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PosShell>
  );
}
