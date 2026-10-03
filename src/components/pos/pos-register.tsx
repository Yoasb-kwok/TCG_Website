"use client";

import { useEffect, useState } from "react";
import { PosNav } from "@/components/pos/pos-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod, type Sale } from "@/lib/pos-shared";
import type { ProductWithVariants } from "@/lib/types";

type TicketLine = {
  key: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

const METHODS = Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][];

function lineTotal(line: TicketLine) {
  return line.quantity * line.unitPrice;
}

export function PosRegister() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [recent, setRecent] = useState<Sale[]>([]);
  const [manual, setManual] = useState({ name: "", unitPrice: "", unitCost: "" });

  const loadRecent = async () => {
    const res = await fetch("/api/pos?period=today");
    const data = (await res.json()) as { sales: Sale[] };
    setRecent(data.sales ?? []);
  };

  useEffect(() => {
    loadRecent().catch(() => undefined);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ pageSize: "8", search: query });
      fetch(`/api/products?${params}`)
        .then((res) => res.json())
        .then((data: { products: ProductWithVariants[] }) => setProducts(data.products ?? []))
        .catch(() => setProducts([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const total = Math.max(0, subtotal - discount);

  const addProduct = (product: ProductWithVariants) => {
    const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
    if (!variant) return;
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        name: product.name,
        sku: variant.sku,
        quantity: 1,
        unitPrice: variant.price,
        unitCost: 0,
      },
    ]);
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
        quantity: 1,
        unitPrice,
        unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 0,
      },
    ]);
    setManual({ name: "", unitPrice: "", unitCost: "" });
  };

  const checkout = async () => {
    setError("");
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
      setLines([]);
      setDiscount(0);
      setNote("");
      await loadRecent();
    } catch {
      setError("未能入帳，請再試一次");
    } finally {
      setPending(false);
    }
  };

  const voidTicket = async (id: string) => {
    if (!window.confirm("作廢這張單？損益表不會再計算它。")) return;
    await fetch(`/api/pos/sales?id=${id}`, { method: "DELETE" });
    await loadRecent();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PosNav current="register" />
      <h1 className="mt-4 text-2xl font-bold">收銀</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        門市銷售會記入損益表。成本留空會當成 0，毛利會偏高。
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋貨品名稱或系列"
          />
          <ul className="divide-y divide-border rounded-xl border border-border">
            {products.map((product) => {
              const variant = product.variants[0];
              return (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {variant ? formatPrice(variant.price) : "未有售價"}
                      {variant?.sku ? ` · ${variant.sku}` : ""}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => addProduct(product)}>
                    加入
                  </Button>
                </li>
              );
            })}
            {products.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">找不到貨品，可以用下方手動加一項。</li>
            )}
          </ul>
          <form
            className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[1fr_7rem_7rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              addManual();
            }}
          >
            <Input
              value={manual.name}
              onChange={(event) => setManual({ ...manual, name: event.target.value })}
              placeholder="手動貨品名稱"
            />
            <Input
              inputMode="decimal"
              value={manual.unitPrice}
              onChange={(event) => setManual({ ...manual, unitPrice: event.target.value })}
              placeholder="售價"
            />
            <Input
              inputMode="decimal"
              value={manual.unitCost}
              onChange={(event) => setManual({ ...manual, unitCost: event.target.value })}
              placeholder="成本"
            />
            <Button type="submit" variant="outline">
              加一項
            </Button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">本單</h2>
            {lines.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">未有貨品</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {lines.map((line) => (
                  <li key={line.key} className="space-y-2 border-b border-border pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{line.name}</p>
                      <button
                        type="button"
                        className="text-xs text-red-400"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      >
                        移除
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-xs text-muted-foreground">
                        數量
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.key === line.key
                                  ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) }
                                  : item,
                              ),
                            )
                          }
                          className="mt-1"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        售價
                        <Input
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.key === line.key
                                  ? { ...item, unitPrice: Math.max(0, Number(event.target.value) || 0) }
                                  : item,
                              ),
                            )
                          }
                          className="mt-1"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        成本
                        <Input
                          type="number"
                          min={0}
                          value={line.unitCost}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.key === line.key
                                  ? { ...item, unitCost: Math.max(0, Number(event.target.value) || 0) }
                                  : item,
                              ),
                            )
                          }
                          className="mt-1"
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <label className="mt-4 block text-xs text-muted-foreground">
              折扣 (HKD)
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))}
                className="mt-1"
              />
            </label>
            <div className="mt-4 flex gap-2">
              {METHODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`h-8 flex-1 rounded-lg text-sm ${
                    method === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-right text-2xl font-bold tabular-nums">{formatPrice(total)}</p>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <Button
              type="button"
              className="mt-3 w-full bg-pink-500 text-white hover:bg-pink-400"
              disabled={pending || lines.length === 0}
              onClick={checkout}
            >
              {pending ? "入帳中…" : `收款 ${formatPrice(total)}`}
            </Button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <h2 className="font-semibold">今日單據</h2>
            <ul className="mt-3 space-y-3">
              {recent.length === 0 && <li className="text-sm text-muted-foreground">未有銷售</li>}
              {recent.map((sale) => {
                const amount = sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - sale.discount;
                return (
                  <li key={sale.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className={sale.voided ? "text-muted-foreground line-through" : ""}>
                      <p>{PAYMENT_LABELS[sale.paymentMethod]} · {formatPrice(Math.max(0, amount))}</p>
                      <p className="text-muted-foreground">{sale.items.map((item) => item.name).join("、")}</p>
                    </div>
                    {!sale.voided && (
                      <button type="button" className="text-xs text-red-400" onClick={() => voidTicket(sale.id)}>
                        作廢
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
