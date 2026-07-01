"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CreditCard, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  calculateShipping,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";

async function parseJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok ? "伺服器回應格式錯誤" : `請求失敗（${res.status}）`,
    );
  }
}

export function CartSheet() {
  const {
    items,
    subtotal,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [pickup, setPickup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [stripeMessage, setStripeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email, email]);

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
    () => calculateShipping(subtotal, pickup),
    [subtotal, pickup],
  );
  const total = subtotal + shippingFee;

  const handleCheckout = async () => {
    if (!email || items.length === 0 || !stripeReady) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          pickup,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await parseJsonResponse<{ url?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "結帳失敗");

      if (data.url) {
        sessionStorage.setItem("tcg-checkout-pending", "1");
        window.location.href = data.url;
        return;
      }

      throw new Error("無法取得 Stripe 結帳連結");
    } catch (err) {
      setError(err instanceof Error ? err.message : "結帳失敗");
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>購物車 ({items.length})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">購物車是空的</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.condition}
                      {item.isFoil ? " · 閃卡" : ""}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatPrice(item.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-border p-1 hover:bg-muted"
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="rounded border border-border p-1 hover:bg-muted"
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="ml-auto p-1 text-muted-foreground hover:text-red-400"
                        onClick={() => removeItem(item.variantId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">小計</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">運費</span>
                <span>
                  {pickup
                    ? "門市自取 · 免費"
                    : shippingFee === 0
                      ? "免運費"
                      : formatPrice(shippingFee)}
                </span>
              </div>
              {!pickup && subtotal < FREE_SHIPPING_THRESHOLD && (
                <p className="text-xs text-muted-foreground">
                  未滿 {formatPrice(FREE_SHIPPING_THRESHOLD)} 加收 {formatPrice(SHIPPING_FEE)} 運費；滿額免運
                </p>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>應付總額</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <Checkbox
                id="pickup"
                checked={pickup}
                onCheckedChange={(checked) => setPickup(Boolean(checked))}
              />
              <Label htmlFor="pickup" className="text-sm font-normal">
                門市自取（免運費）
              </Label>
            </div>

            <div className="mb-4 space-y-2">
              <Label htmlFor="checkout-email">電郵（收訂單確認）</Label>
              <Input
                id="checkout-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border bg-background"
                autoComplete="email"
              />
            </div>

            {stripeReady === false && (
              <p className="mb-2 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                {stripeMessage ??
                  "Stripe 尚未設定。請在 .env 加入 STRIPE_SECRET_KEY 後重啟 server。"}
              </p>
            )}

            {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

            <Button
              className="w-full gap-2"
              disabled={loading || !email || stripeReady !== true}
              onClick={() => void handleCheckout()}
            >
              <CreditCard className="h-4 w-4" />
              {loading ? "前往 Stripe..." : "安全結帳"}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              由 Stripe 安全處理 · 支援信用卡及 Apple Pay
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full text-muted-foreground"
              onClick={clearCart}
            >
              清空購物車
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
