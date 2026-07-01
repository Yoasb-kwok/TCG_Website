import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe 尚未設定" }, { status: 503 });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "缺少 session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    const paid =
      checkoutSession.payment_status === "paid" ||
      checkoutSession.status === "complete";

    let order: {
      id: string;
      email: string;
      totalAmount: number;
      status: string;
      items: { name: string; quantity: number; unitPrice: number }[];
    } | null = null;

    if (isDatabaseConfigured()) {
      const row = await getPrisma().order.findUnique({
        where: { stripeSessionId: sessionId },
        include: {
          items: {
            include: {
              variant: { include: { product: { select: { name: true } } } },
            },
          },
        },
      });

      if (row) {
        order = {
          id: row.id,
          email: row.email,
          totalAmount: row.totalAmount,
          status: row.status,
          items: row.items.map((item) => ({
            name: item.variant.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };
      }
    }

    return NextResponse.json({
      paid,
      email:
        checkoutSession.customer_email ??
        checkoutSession.customer_details?.email ??
        order?.email,
      amountTotal: checkoutSession.amount_total
        ? checkoutSession.amount_total / 100
        : order?.totalAmount,
      currency: checkoutSession.currency ?? "hkd",
      order,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "無法讀取付款狀態";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
