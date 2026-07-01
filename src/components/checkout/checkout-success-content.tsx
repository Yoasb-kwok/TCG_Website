"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";
import { cn } from "@/lib/utils";

interface CheckoutSessionResponse {
  paid?: boolean;
  email?: string;
  amountTotal?: number;
  error?: string;
  order?: {
    id: string;
    items: { name: string; quantity: number; unitPrice: number }[];
  };
}

export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CheckoutSessionResponse | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
        );
        const json = (await res.json()) as CheckoutSessionResponse;
        if (res.ok && json.paid) {
          clearCart();
          setData(json);
        } else {
          setData({ error: json.error ?? "無法確認付款狀態" });
        }
      } catch {
        setData({ error: "無法確認付款狀態" });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">確認付款中...</p>
      </div>
    );
  }

  if (!sessionId || data?.error || !data?.paid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-400" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">無法確認付款</h1>
        <p className="mt-2 text-muted-foreground">
          {data?.error ?? "缺少付款 session。如已扣款，請 WhatsApp 聯絡我們並提供電郵。"}
        </p>
        <Link href="/products" className={cn(buttonVariants(), "mt-8 inline-flex")}>
          返回商品
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
      <h1 className="mt-6 text-2xl font-bold text-foreground">付款成功！</h1>
      <p className="mt-2 text-muted-foreground">
        多謝你的訂購{data.email ? `，確認電郵已發送至 ${data.email}` : ""}。
        我們會盡快處理訂單。
      </p>

      {typeof data.amountTotal === "number" && (
        <p className="mt-4 text-lg font-semibold text-foreground">
          總計 {formatPrice(data.amountTotal)}
        </p>
      )}

      {data.order?.items?.length ? (
        <ul className="mt-6 space-y-2 rounded-lg border border-border bg-card p-4 text-left text-sm">
          {data.order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
              <span className="text-foreground">
                {item.name} × {item.quantity}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {formatPrice(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Link href="/products" className={cn(buttonVariants(), "mt-8 inline-flex")}>
        繼續購物
      </Link>
    </div>
  );
}
