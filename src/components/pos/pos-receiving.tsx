"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { formatPrice } from "@/lib/format";
import type { Receipt } from "@/lib/pos-shared";
import type { ProductWithVariants } from "@/lib/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-pink-400";

const dangerButton =
  "inline-flex h-8 shrink-0 items-center rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-bold text-red-400 hover:bg-red-500/20";

export function PosReceiving() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const loadProducts = async (search: string) => {
    const params = new URLSearchParams({ pageSize: "48", search });
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
      loadProducts(query).catch(() => setProducts([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

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
      await Promise.all([loadProducts(query), loadReceipts()]);
    } catch {
      setError("未能入貨，請再試一次");
    } finally {
      setPending(false);
    }
  };

  const undo = async (id: string) => {
    if (!window.confirm("撤銷這筆來貨？庫存會扣回，進貨成本也不再計入損益。")) return;
    await fetch(`/api/pos/receipts?id=${id}`, { method: "DELETE" });
    await Promise.all([loadProducts(query), loadReceipts()]);
  };

  return (
    <PosShell current="receiving">
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,16rem)_auto] gap-4 overflow-auto p-4 lg:grid-cols-[minmax(280px,1fr)_22rem] lg:grid-rows-1 lg:overflow-hidden">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-muted-foreground">已上架貨品</p>
            <p className="text-xs font-bold text-muted-foreground">撳一下就點算</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="打卡名、系列或編號"
            className={cn(fieldClass, "mt-3")}
          />
          <ul className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {products.flatMap((product) => {
              const image = product.images[0];
              return product.variants.map((item) => {
                const active = item.id === selectedVariantId;
                const detail = [item.condition, item.isFoil ? "閃" : ""].filter(Boolean).join(" ");
                const label = product.variants.length > 1 ? `${product.name} · ${detail}` : product.name;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => choose(product, item.id)}
                      className={cn(
                        "flex h-full w-full flex-col rounded-[10px] border bg-card p-2 text-left",
                        active ? "border-pink-500" : "border-border hover:border-pink-400",
                      )}
                    >
                      <span className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {image ? (
                          <Image src={image.url} alt="" fill className="object-contain p-1" sizes="140px" unoptimized />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">無圖</span>
                        )}
                      </span>
                      <span className="mt-2 line-clamp-2 text-sm font-extrabold leading-snug">{label}</span>
                      <span className="mt-auto pt-1 text-xs font-bold text-muted-foreground">
                        存 {item.stock}
                        {item.price > 0 ? ` · ${formatPrice(item.price)}` : " · 未定價"}
                      </span>
                    </button>
                  </li>
                );
              });
            })}
            {products.length === 0 && (
              <li className="col-span-full px-2 py-8 text-center text-sm font-bold text-muted-foreground">
                未有上架貨品。請先在後台商品名單加入。
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
