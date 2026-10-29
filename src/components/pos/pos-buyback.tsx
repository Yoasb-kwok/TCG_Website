"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BarcodeScanButton } from "@/components/barcode-scan-button";
import { CatalogHitStrip, catalogHitName } from "@/components/catalog/catalog-hit-strip";
import { PosShell } from "@/components/pos/pos-nav";
import {
  posBlackBtn,
  posChip,
  posGhostBtn,
  posInput,
  posLavenderBtn,
  posPastel,
  posPinkBtn,
  posSub,
  posTitle,
  posWhen,
} from "@/components/pos/pos-ui";
import { fetchCatalogProducts } from "@/lib/fetch-catalog-products";
import { formatPrice, formatStaffMoney } from "@/lib/format";
import { CatalogBuybackOffer } from "@/components/pos/catalog-buyback-offer";
import { buybackDayTotal, buybackPriceCopy } from "@/lib/pos-buyback";
import type { Buyback } from "@/lib/pos-shared";
import type { CatalogSearchHit, ProductWithVariants } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePublicTaxonomy } from "@/hooks/use-public-taxonomy";
import { SET_SERIES_CODES } from "@/lib/card-taxonomy";

const fieldClass = posInput;

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
  const [setCode, setSetCode] = useState("");
  const [rarity, setRarity] = useState("");
  const [language, setLanguage] = useState("");
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
          { search: query, setCodes: setCode ? [setCode] : undefined },
          searching || setCode ? { all: true } : { page, pageSize: 48 },
        );
        if (cancelled) return;
        setProducts((current) => (searching || setCode || page === 1 ? data.products : [...current, ...data.products]));
        setCatalogCards(searching ? data.catalogCards : []);
        setCatalogTotal(searching ? data.catalogTotal : 0);
        setTotal(data.total);
        setComplete(searching || setCode ? data.complete : page >= data.totalPages);
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
  }, [query, searching, page, refreshKey, setCode]);

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
    if (!window.confirm("撤銷這筆收卡？庫存會扣回，收取價錢也不再計入損益。")) return;
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

  const matchesLanguage = (value: string) => {
    if (!language) return true;
    const text = value.toLowerCase();
    if (language === "zh") return text.startsWith("zh") || text.includes("中");
    if (language === "ja") return text.startsWith("ja") || text.includes("日");
    return true;
  };
  const rarities = [...new Set(products.map((product) => product.rarityTier || product.rarity).filter(Boolean))] as string[];
  const rows = products
    .filter((product) => matchesLanguage(product.language))
    .filter((product) => !rarity || (product.rarityTier || product.rarity) === rarity)
    .flatMap((product) => product.variants.map((item) => ({ product, item })));
  const catalogCard = selection?.kind === "catalog" ? selection.card : null;
  const selectionName = selectedProduct?.name ?? (catalogCard ? catalogHitName(catalogCard) : "");
  const activeBuys = buybacks.filter((row) => !row.voided);

  return (
    <PosShell current="buyback" storefrontNav>
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-auto px-4 py-6 lg:px-16 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>收卡</h1>
            <p className={posSub}>搜尋卡牌、確認品相與收購價，完成店內收卡。</p>
          </div>
          <BarcodeScanButton
            label="開啟掃描器"
            className={cn(posBlackBtn, "w-[160px] border-0")}
            onDetect={(code) => void scanIntoBuyback(code)}
          />
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
                placeholder="搜尋卡名、系列、卡號或條碼"
                aria-label="搜尋收卡"
                className={cn(fieldClass, "min-w-[240px] max-w-[520px] flex-1")}
              />
              <BarcodeScanButton label="掃描卡牌" className={cn(posLavenderBtn, "w-[140px] border-0")} onDetect={(code) => void scanIntoBuyback(code)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setSetCode(""); setPage(1); }} className={posChip(setCode === "")}>
                全部系列
              </button>
              {series.slice(0, 8).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setSetCode((current) => (current === item.value ? "" : item.value));
                    setPage(1);
                  }}
                  className={posChip(setCode === item.value)}
                >
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={() => setRarity("")} className={posChip(rarity === "")}>
                全部稀有度
              </button>
              {rarities.slice(0, 6).map((item) => (
                <button key={item} type="button" onClick={() => setRarity((current) => (current === item ? "" : item))} className={posChip(rarity === item)}>
                  {labelFor("RARITY", item)}
                </button>
              ))}
              <button type="button" onClick={() => setLanguage((current) => (current === "zh" ? "" : "zh"))} className={posChip(language === "zh")}>
                中文
              </button>
              <button type="button" onClick={() => setLanguage((current) => (current === "ja" ? "" : "ja"))} className={posChip(language === "ja")}>
                日文
              </button>
            </div>
            <p className="text-[13px] text-[#706c68]">
              {searching ? `找到 ${rows.length} 件已上架` : `顯示 ${products.length} / ${total}`}
              {searching && !complete ? "（結果太多，請再縮小關鍵字）" : ""}
            </p>
            {searching && (
              <CatalogHitStrip
                cards={catalogCards}
                total={catalogTotal}
                hint="撳卡表可以直接收卡。未上架的卡會新建庫存，售價留空。"
                onPick={chooseCatalog}
              />
            )}
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map(({ product, item }, index) => {
                const image = product.images[0];
                const active = selection?.kind === "variant" && selection.variantId === item.id;
                const offer = item.buybackPrice && item.buybackPrice > 0 ? `建議收購 ${formatPrice(item.buybackPrice)}` : "建議收購未設定";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => chooseVariant(product, item.id)}
                      className={cn(
                        "flex h-full w-full flex-col gap-2 rounded-[20px] border p-4 text-left shadow-[0_10px_14px_rgba(74,44,22,0.1)]",
                        active ? "border-[#171514]" : "border-[rgba(222,214,203,0.7)]",
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
                      <span className="line-clamp-2 text-[15px] font-bold">{product.name}</span>
                      <span className="text-[13px] text-[#706c68]">
                        {[product.setCode, product.cardNumber, item.condition].filter(Boolean).join(" · ")}
                      </span>
                      <span className="text-[15px] font-bold">{offer}</span>
                    </button>
                  </li>
                );
              })}
              {rows.length === 0 && (
                <li className="text-[14px] text-[#706c68] sm:col-span-2 xl:col-span-3">
                  {searching ? "沒有已上架貨品。可以揀上面的卡表。" : "未有上架貨品。搜尋卡名或卡號就可以從卡表收卡。"}
                </li>
              )}
            </ul>
            {!searching && !setCode && !complete && (
              <button type="button" onClick={() => setPage((current) => current + 1)} className={posGhostBtn}>
                載入更多
              </button>
            )}

            <div className="overflow-hidden rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
              <div className="flex items-baseline justify-between px-4 py-3">
                <h2 className="text-[18px] font-bold">今日收卡紀錄</h2>
                <p className="text-[14px] font-bold text-[#3f6b16]">
                  {activeBuys.reduce((sum, row) => sum + row.quantity, 0)} 張 · {formatStaffMoney(buybackDayTotal(buybacks))}
                </p>
              </div>
              <table className="w-full text-left text-[14px]">
                <thead className="bg-[#faf8f3] text-[13px] text-[#706c68]">
                  <tr>
                    <th className="px-4 py-2 font-bold">時間</th>
                    <th className="px-4 py-2 font-bold">卡牌</th>
                    <th className="px-4 py-2 font-bold">品相</th>
                    <th className="px-4 py-2 font-bold">收購價</th>
                    <th className="px-4 py-2 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {buybacks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-[#706c68]">今日未有收卡</td>
                    </tr>
                  )}
                  {buybacks.map((row) => (
                    <tr key={row.id} className="border-t border-[#ded6cb]">
                      <td className="px-4 py-3 text-[#706c68]">{posWhen(row.createdAt)}</td>
                      <td className={cn("px-4 py-3 font-bold", row.voided && "text-[#706c68] line-through")}>{row.name}</td>
                      <td className="px-4 py-3 text-[#706c68]">{row.note || "—"}</td>
                      <td className="px-4 py-3 font-bold">{buybackPriceCopy(row)}</td>
                      <td className="px-4 py-3 text-right">
                        {!row.voided && (
                          <button type="button" className="font-bold text-[#9a3412]" onClick={() => void undo(row.id)}>
                            撤銷
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white p-5 shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
            <h2 className="text-[22px] font-bold">收卡明細</h2>
            {selection ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex h-[140px] items-center justify-center rounded-[16px] bg-[#e8dfff] text-[18px] font-bold text-[#706c68]">
                  {selectedProduct?.images[0] ? (
                    <span className="relative block h-full w-full">
                      <Image src={selectedProduct.images[0].url} alt="" fill className="object-contain p-4" sizes="320px" unoptimized />
                    </span>
                  ) : (
                    "CARD PREVIEW"
                  )}
                </div>
                <div>
                  <p className="text-[18px] font-bold">{selectionName}</p>
                  <p className="text-[13px] text-[#706c68]">
                    {selectedProduct
                      ? [selectedProduct.setCode, selectedProduct.cardNumber].filter(Boolean).join(" · ")
                      : catalogCard
                        ? [catalogCard.setCode, catalogCard.collectorNumber].filter(Boolean).join(" ")
                        : ""}
                  </p>
                </div>
                {selectedProduct && selectedVariant && (
                  <label className="block text-[13px] font-bold">
                    品相
                    <select
                      value={selectedVariant.id}
                      onChange={(event) => chooseVariant(selectedProduct, event.target.value)}
                      className={cn(fieldClass, "mt-1.5")}
                    >
                      {selectedProduct.variants.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.condition}
                          {item.isFoil ? " · 閃" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selectedVariant && (
                  <CatalogBuybackOffer
                    variant="panel"
                    buybackPrice={selectedVariant.buybackPrice}
                    targetBuybackQty={selectedVariant.targetBuybackQty}
                  />
                )}
                {catalogCard && (
                  <p className="text-[13px] text-[#706c68]">
                    如果店內已有這張卡，庫存會加到 Near Mint。要指定品相，請直接揀已上架的貨。
                  </p>
                )}
                <label className="block text-[13px] font-bold">
                  收購價
                  <input
                    inputMode="decimal"
                    value={unitBuyPrice}
                    onChange={(event) => setUnitBuyPrice(event.target.value)}
                    placeholder="HK$0"
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </label>
                <label className="block text-[13px] font-bold">
                  數量
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </label>
                <label className="block text-[13px] font-bold">
                  客人姓名（可留空）
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={cn(fieldClass, "mt-1.5")} />
                </label>
                <label className="block text-[13px] font-bold">
                  電話（可留空）
                  <input
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="8 位香港號碼"
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </label>
                <label className="block text-[13px] font-bold">
                  Pokémon ID（可留空）
                  <input value={pokemonId} onChange={(event) => setPokemonId(event.target.value)} className={cn(fieldClass, "mt-1.5")} />
                </label>
                <label className="block text-[13px] font-bold">
                  備註（可留空）
                  <input value={note} onChange={(event) => setNote(event.target.value)} className={cn(fieldClass, "mt-1.5")} />
                </label>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#706c68]">收取合計</span>
                  <span className="text-[18px] font-bold tabular-nums">{formatStaffMoney(lineTotal)}</span>
                </div>
                {error && <p className="text-[14px] font-bold text-[#9a3412]">{error}</p>}
                {message && <p className="text-[14px] font-bold">{message}</p>}
                <button
                  type="button"
                  disabled={pending || !Number.isInteger(qty) || qty < 1 || unitBuyPrice.trim() === "" || !Number.isFinite(price) || price <= 0}
                  onClick={() => void submit()}
                  className={cn(posPinkBtn, "w-full")}
                >
                  {pending ? "入帳中…" : "確認收卡"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex h-[140px] items-center justify-center rounded-[16px] bg-[#e8dfff] text-[18px] font-bold text-[#706c68]">
                  CARD PREVIEW
                </div>
                <p className="text-[14px] text-[#706c68]">搜尋後撳一件已上架的貨，或者撳卡表的卡。再填數量同收購價。</p>
                {error && <p className="text-[14px] font-bold text-[#9a3412]">{error}</p>}
                {message && <p className="text-[14px] font-bold">{message}</p>}
                <button type="button" disabled className={cn(posPinkBtn, "w-full")}>
                  確認收卡
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </PosShell>
  );
}
