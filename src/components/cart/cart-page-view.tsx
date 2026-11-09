"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { FoundationButton } from "@/components/foundations/button";
import { FoundationField } from "@/components/foundations/field";
import { homeContainer } from "@/components/home/home-layout";
import {
  calculateShipping,
  SHIPPING_METHOD_LABELS,
  type ShippingMethod,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";

const PAGE_SHIPPING: ShippingMethod[] = ["PICKUP", "PREPAID", "COD"];

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
    <section className={`${homeContainer} flex flex-col gap-8 py-16 text-trtcg-ink`}>
      <h1 className="text-[40px] font-medium leading-[1.3]">購物車 ({itemCount})</h1>
      {itemCount === 0 ? (
        <div className="flex w-full flex-col items-center gap-8 rounded-[24px] bg-trtcg-surface p-16 shadow-trtcg-card">
          <Image src="/brand/home/icon-bag-empty.svg" alt="" width={48} height={48} unoptimized />
          <p className="text-[28px] font-medium leading-[1.4]">購物車是空的</p>
          <FoundationButton variant="primary" className="w-[180px]" render={<Link href="/products" />}>
            商品
          </FoundationButton>
        </div>
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,464px)] xl:gap-[40px]">
          <div className="flex flex-col gap-7 rounded-[24px] bg-trtcg-surface p-6 sm:p-8">
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
                    <p className="text-[13px] leading-[1.6] text-trtcg-muted">
                      {item.condition}
                      {item.isFoil ? " · 閃卡" : ""}
                    </p>
                    <p className="text-[24px] font-medium leading-[1.2]">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-5">
                      <FoundationButton
                        type="button"
                        variant="secondary"
                        className="w-[50px] px-0"
                        aria-label={`減少 ${item.name}`}
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      >
                        −
                      </FoundationButton>
                      <span className="min-w-4 text-center text-[16px] leading-[1.65]">{item.quantity}</span>
                      <FoundationButton
                        type="button"
                        variant={item.quantity >= item.stock ? "disabled" : "secondary"}
                        className="w-[50px] px-0"
                        aria-label={`增加 ${item.name}`}
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      >
                        +
                      </FoundationButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <FoundationButton type="button" variant="quiet" className="w-[180px]" onClick={clearCart}>
              清空購物車
            </FoundationButton>
          </div>

          <aside className="flex flex-col gap-6 rounded-[12px] border border-trtcg-gold/90 bg-white/98 p-6 shadow-trtcg-card sm:p-8">
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
            <div className="h-px bg-trtcg-gold/55" />
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
                    className="size-4 accent-trtcg-header"
                  />
                  {SHIPPING_METHOD_LABELS[method]}
                </label>
              ))}
            </fieldset>
            <FoundationField
              label="電郵（收訂單確認）"
              type="email"
              value={emailValue}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="max-w-none"
            />
            {stripeReady === false && (
              <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                {stripeMessage ?? "Stripe 尚未設定。"}
              </p>
            )}
            {error && <p className="text-[14px] text-red-600">{error}</p>}
            <FoundationButton
              type="button"
              variant={loading || !emailValue || !stripeReady ? "disabled" : "primary"}
              onClick={checkout}
              className="w-full"
            >
              {loading ? "處理中…" : "安全結帳"}
            </FoundationButton>
            <p className="text-[13px] leading-[1.6] text-trtcg-muted">
              由 Stripe 安全處理 · 支援信用卡及 Apple Pay
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
