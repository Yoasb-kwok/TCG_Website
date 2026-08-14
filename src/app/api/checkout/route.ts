import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/auth";
import {
  calculateShipping,
  toAbsoluteImageUrl,
} from "@/lib/checkout";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

export async function GET() {
  return NextResponse.json({
    ready: isStripeConfigured(),
    message: isStripeConfigured()
      ? undefined
      : "請在 .env 設定有效的 STRIPE_SECRET_KEY（Stripe Dashboard → Developers → API keys）",
  });
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe 尚未設定。請在 .env 加入有效的 STRIPE_SECRET_KEY，並重啟 dev server。",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    items: CheckoutItem[];
    email: string;
    pickup?: boolean;
  };

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "請輸入有效電郵" }, { status: 400 });
  }
  if (!body.items?.length) {
    return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await auth();
  const pickup = Boolean(body.pickup);

  const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [];
  let subtotal = 0;
  const orderItems: { variantId: string; quantity: number; unitPrice: number }[] =
    [];

  try {
    if (isDatabaseConfigured()) {
      const prisma = getPrisma();
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: body.items.map((i) => i.variantId) } },
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
      });

      // ADR-005: Fetch global critical threshold for buffer zone
      const shopSetting = await prisma.shopSetting.findUnique({ where: { id: "default" } });
      const globalCritical = shopSetting?.defaultCriticalThreshold ?? 2;

      if (variants.length !== body.items.length) {
        const found = new Set(variants.map((v) => v.id));
        const missing = body.items.filter((i) => !found.has(i.variantId));
        throw new Error(`找不到商品，請重新加入購物車（${missing[0]?.variantId}）`);
      }

      for (const item of body.items) {
        const variant = variants.find((v) => v.id === item.variantId)!;
        // ADR-005: Buffer zone — sellable = actual − effectiveCriticalThreshold
        const effectiveCritical = variant.criticalThreshold ?? globalCritical;
        const sellable = Math.max(0, variant.stock - effectiveCritical);
        if (sellable < item.quantity) {
          throw new Error(`${variant.product.name} 庫存不足（可售 ${sellable}）`);
        }
        subtotal += variant.price * item.quantity;
        orderItems.push({
          variantId: variant.id,
          quantity: item.quantity,
          unitPrice: variant.price,
        });

        const imageUrl = toAbsoluteImageUrl(
          variant.product.images[0]?.url,
          appUrl,
        );

        lineItems.push({
          price_data: {
            currency: "hkd",
            product_data: {
              name: `${variant.product.name} (${variant.condition}${variant.isFoil ? " · 閃卡" : ""})`,
              images: imageUrl ? [imageUrl] : undefined,
              tax_code: "txcd_99999999",
            },
            unit_amount: Math.round(variant.price * 100),
          },
          quantity: item.quantity,
        });
      }
    } else {
      const { DEMO_PRODUCTS } = await import("@/lib/demo-products");
      for (const item of body.items) {
        let found = false;
        for (const product of DEMO_PRODUCTS) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (variant) {
            found = true;
            subtotal += variant.price * item.quantity;
            orderItems.push({
              variantId: variant.id,
              quantity: item.quantity,
              unitPrice: variant.price,
            });
            lineItems.push({
              price_data: {
                currency: "hkd",
                product_data: {
                  name: `${product.name} (${variant.condition})`,
                  images: product.images[0]?.url
                    ? [product.images[0].url]
                    : undefined,
                  tax_code: "txcd_99999999",
                },
                unit_amount: Math.round(variant.price * 100),
              },
              quantity: item.quantity,
            });
            break;
          }
        }
        if (!found) throw new Error(`找不到商品 ${item.variantId}`);
      }
    }

    const shippingFee = calculateShipping(subtotal, pickup);
    if (shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: "hkd",
          product_data: { name: "本地運費（順豐）" },
          unit_amount: Math.round(shippingFee * 100),
        },
        quantity: 1,
      });
    }

    const totalAmount = subtotal + shippingFee;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        pickup: pickup ? "1" : "0",
        variantIds: body.items.map((i) => i.variantId).join(","),
        quantities: body.items.map((i) => i.quantity).join(","),
      },
    });

    if (isDatabaseConfigured()) {
      await getPrisma().order.create({
        data: {
          userId: session?.user?.id,
          email,
          stripeSessionId: checkoutSession.id,
          totalAmount,
          currency: "hkd",
          status: "PENDING",
          items: { create: orderItems },
        },
      });
    }

    if (!checkoutSession.url) {
      throw new Error("無法建立 Stripe 結帳連結");
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "結帳失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
