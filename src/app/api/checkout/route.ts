import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe 尚未設定，請在 .env 加入 STRIPE_SECRET_KEY" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    items: CheckoutItem[];
    email: string;
  };

  if (!body.email || !body.items?.length) {
    return NextResponse.json({ error: "缺少 email 或商品" }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [];
  let totalAmount = 0;
  const orderItems: { variantId: string; quantity: number; unitPrice: number }[] =
    [];

  try {
    if (isDatabaseConfigured()) {
      const prisma = getPrisma();
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: body.items.map((i) => i.variantId) } },
        include: { product: { include: { images: true } } },
      });

      for (const item of body.items) {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) throw new Error(`找不到商品 ${item.variantId}`);
        if (variant.stock < item.quantity) {
          throw new Error(`${variant.product.name} 庫存不足`);
        }
        totalAmount += variant.price * item.quantity;
        orderItems.push({
          variantId: variant.id,
          quantity: item.quantity,
          unitPrice: variant.price,
        });
        lineItems.push({
          price_data: {
            currency: "hkd",
            product_data: {
              name: `${variant.product.name} (${variant.condition}${variant.isFoil ? " · 閃卡" : ""})`,
              images: variant.product.images[0]?.url
                ? [variant.product.images[0].url]
                : undefined,
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
            totalAmount += variant.price * item.quantity;
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: lineItems,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        variantIds: body.items.map((i) => i.variantId).join(","),
        quantities: body.items.map((i) => i.quantity).join(","),
      },
    });

    if (isDatabaseConfigured()) {
      await getPrisma().order.create({
        data: {
          email: body.email,
          stripeSessionId: session.id,
          totalAmount,
          currency: "hkd",
          status: "PENDING",
          items: { create: orderItems },
        },
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "結帳失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
