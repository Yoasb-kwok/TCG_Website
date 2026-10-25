"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { homeContainer } from "@/components/home/home-layout";
import {
  calculateShipping,
  SHIPPING_METHOD_LABELS,
  type ShippingMethod,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";
import { cn } from "@/lib/utils";

const PAGE_SHIPPING: ShippingMethod[] = ["PICKUP", "PREPAID", "COD"];

const qtyButton =
  "inline-flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#6f59c7] bg-[#e6dfff] text-[18px] text-[#080808] transition hover:bg-[#ddd4fb] disabled:cursor-not-allowed disabled:opacity-40";

export function CartPageView() {
  const { items, itemCount, subtotal, updateQuantity, clearCart } = useCart();
  const { data: session } = useSession();
  const [email, setEmail] = useState<string | null>(null);
  const emailValue = email ?? session?.user?.email ?? "";
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("PICKUP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [stripeMessage, setStripeMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/checkout")
      .then((res) => res.json())
      .then((data: { ready?: boolean; message?: string }) => {
        setStripeReady(Boolean(data.ready));
        setStripeMessage(data.message ?? null);
      })
      .catch(() => {
        setStripeReady(false);
        setStripeMessage("無法連接結帳服務");
      });
  }, []);

  const shippingFee = useMemo(
    () => calculateShipping(subtotal, shippingMethod),
    [subtotal, shippingMethod],
  );
  const total = subtotal + shippingFee;
  const shippingLabel =
    shippingMethod === "PICKUP"
      ? "門市自取 · 免費"
      : shippingMethod === "COD"
        ? "速遞到付"
        : shippingFee === 0
          ? "免運費"
          : formatPrice(shippingFee);

  const checkout = async () => {
    if (!emailValue || items.length === 0 || !stripeReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValue.trim(),
          shippingMethod,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "結帳失敗");
      sessionStorage.setItem("tcg-checkout-pending", "1");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "結帳失敗");
      setLoading(false);
    }
  };

  return (
    <section className={`${homeContainer} flex flex-col gap-8 py-16 text-[#0a0a09]`}>
      <h1 className="text-[40px] font-medium leading-[1.3]">購物車 ({itemCount})</h1>
      {itemCount === 0 ? (
        <div className="flex w-full flex-col items-center gap-8 rounded-[24px] bg-white p-16 shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
          <Image src="/brand/home/icon-bag-empty.svg" alt="" width={48} height={48} unoptimized />
          <p className="text-[28px] font-medium leading-[1.4]">購物車是空的</p>
          <Link
            href="/products"
            className="inline-flex h-12 w-[180px] items-center justify-center rounded-[10px] border border-[#c8a24a] bg-[#080808] px-6 text-[14px] font-medium leading-[1.45] text-white transition hover:bg-[#1c1c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
          >
            商品
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,464px)] xl:gap-10">
          <div className="flex flex-col gap-6 rounded-[24px] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.06)] sm:p-8">
            <ul className="flex flex-col gap-8">
              {items.map((item) => (
                <li key={item.variantId} className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                  <div className="relative h-[168px] w-[120px] shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="120px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <p className="text-[28px] font-medium leading-[1.4]">{item.name}</p>
                    <p className="text-[13px] leading-[1.6] text-[#625f58]">
                      {item.condition}
                      {item.isFoil ? " · 閃卡" : ""}
                    </p>
                    <p className="text-[24px] font-medium leading-[1.2]">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        className={qtyButton}
                        aria-label={`減少 ${item.name}`}
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-[18px]">{item.quantity}</span>
                      <button
                        type="button"
                        className={qtyButton}
                        aria-label={`增加 ${item.name}`}
                        disabled={item.quantity >= item.stock}
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex h-12 w-fit items-center justify-center rounded-[10px] bg-[#e7f3c9] px-6 text-[14px] font-medium text-[#080808] transition hover:bg-[#dcebb6]"
            >
              清空購物車
            </button>
          </div>

          <aside className="flex flex-col gap-6 rounded-[24px] border border-[#c8a24a] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.06)] sm:p-8">
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <span>小計</span>
              <span className="text-[18px] font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <span>運費</span>
              <span className="text-[16px]">{shippingLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[14px]">應付總額</span>
              <span className="text-[24px] font-medium">{formatPrice(total)}</span>
            </div>
            <div className="h-px bg-[#e6dfd2]" />
            <fieldset className="flex flex-col gap-4">
              <legend className="text-[14px] font-medium">送貨方式</legend>
              {PAGE_SHIPPING.map((method) => (
                <label key={method} className="flex items-center gap-3 text-[16px]">
                  <input
                    type="radio"
                    name="cart-shipping"
                    value={method}
                    checked={shippingMethod === method}
                    onChange={() => setShippingMethod(method)}
                    className="size-4 accent-[#080808]"
                  />
                  {SHIPPING_METHOD_LABELS[method]}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-2 text-[14px] font-medium">
              電郵（收訂單確認）
              <input
                type="email"
                value={emailValue}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-12 rounded-[10px] border border-[#e6dfd2] bg-[#fbf6ea] px-4 text-[16px] font-normal outline-none focus:border-[#c8a24a]"
              />
            </label>
            {stripeReady === false && (
              <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                {stripeMessage ?? "Stripe 尚未設定。"}
              </p>
            )}
            {error && <p className="text-[14px] text-red-600">{error}</p>}
            <button
              type="button"
              onClick={checkout}
              disabled={loading || !emailValue || !stripeReady}
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-[10px] border border-[#c8a24a] bg-[#080808] text-[14px] font-medium text-white transition hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#d9d4c9] disabled:text-[#77736b]",
              )}
            >
              {loading ? "處理中…" : "安全結帳"}
            </button>
            <p className="text-center text-[13px] leading-[1.6] text-[#625f58]">
              由 Stripe 安全處理 · 支援信用卡及 Apple Pay
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
