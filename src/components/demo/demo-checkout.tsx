"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateShipping,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  SHIPPING_METHOD_LABELS,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/lib/checkout";
import { demoCtaClass, demoPanelClass } from "@/components/demo/demo-look";
import { DEMO_SHOP, DEMO_STORE_PATH, DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";

export function DemoCheckout() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const [email, setEmail] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("PICKUP");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shippingFee = useMemo(
    () => calculateShipping(subtotal, shippingMethod),
    [subtotal, shippingMethod],
  );
  const total = subtotal + shippingFee;

  const pay = async () => {
    if (!email || items.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/demo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          shippingMethod,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (data.url) {
        setMessage(DEMO_WRITE_DISCLAIMER);
        return;
      }
      setMessage(data.error ?? DEMO_WRITE_DISCLAIMER);
    } catch {
      setMessage(DEMO_WRITE_DISCLAIMER);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">結帳</h1>
        <p className="mt-3 text-sm text-slate-400">購物車是空的。</p>
        <Link href={DEMO_STORE_PATH} className="mt-6 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200">
          返回商品
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">結帳</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          示範店可以走到付款這一步。按下付款後不會建立 Stripe 付款，也不會寫入訂單。
        </p>

        <ol className="mt-8 space-y-8">
          <li>
            <h2 className="font-semibold">1. 確認商品</h2>
            <ul className="mt-3 space-y-3">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3 rounded-2xl border border-white/10 bg-[#10182b] p-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt="" fill className="object-contain p-1" unoptimized />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.condition}
                      {item.isFoil ? " · 閃卡" : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        className="rounded border border-border px-2"
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        aria-label={`減少 ${item.name}`}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="rounded border border-border px-2"
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        aria-label={`增加 ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-xs text-muted-foreground hover:text-red-400"
                        onClick={() => removeItem(item.variantId)}
                      >
                        移除
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </li>

          <li>
            <h2 className="font-semibold">2. 送貨方式</h2>
            <fieldset className="mt-3 space-y-2">
              <legend className="sr-only">送貨方式</legend>
              {SHIPPING_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="demo-shipping"
                    value={method}
                    checked={shippingMethod === method}
                    onChange={() => setShippingMethod(method)}
                    className="size-4 accent-sky-400"
                  />
                  {SHIPPING_METHOD_LABELS[method]}
                </label>
              ))}
            </fieldset>
            {shippingMethod === "PICKUP" && (
              <p className="mt-2 text-xs text-muted-foreground">自取地點：{DEMO_SHOP.address.zh}</p>
            )}
            {shippingMethod === "PREPAID" && subtotal < FREE_SHIPPING_THRESHOLD && (
              <p className="mt-2 text-xs text-muted-foreground">
                未滿 {formatPrice(FREE_SHIPPING_THRESHOLD)} 加收 {formatPrice(SHIPPING_FEE)} 運費。
              </p>
            )}
          </li>

          <li>
            <h2 className="font-semibold">3. 聯絡電郵</h2>
            <div className="mt-3 max-w-md space-y-2">
              <Label htmlFor="demo-email">電郵</Label>
              <Input
                id="demo-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </li>
        </ol>
      </div>

      <aside className={`${demoPanelClass} h-fit p-5`}>
        <h2 className="font-semibold">4. 付款</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">小計</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">運費</dt>
            <dd>{shippingFee === 0 ? "HK$0" : formatPrice(shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <dt>應付</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>
        {message && (
          <p role="alert" className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            {message}
            <span className="mt-1 block text-xs text-amber-800/80 dark:text-amber-100/80">沒有建立 Stripe 付款，亦沒有寫入訂單。</span>
          </p>
        )}
        <Button className={`${demoCtaClass} mt-4 h-11 w-full`} disabled={loading || !email} onClick={() => void pay()}>
          <CreditCard className="h-4 w-4" />
          {loading ? "處理中…" : "付款"}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">{DEMO_WRITE_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
