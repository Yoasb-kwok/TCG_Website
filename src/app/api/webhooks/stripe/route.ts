import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendOrderReceipt } from "@/lib/email";
import { formatDate, formatPrice } from "@/lib/format";
import {
  createOrderTransaction,
  createTournamentTransaction,
} from "@/lib/transactions";
import { awardOrderPoints, awardTournamentPoints } from "@/lib/points";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ received: true });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook config" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const prisma = getPrisma();

    // ── Tournament registration payment ──────────────────────────
    if (session.metadata?.type === "tournament_registration") {
      const registration = await prisma.tournamentRegistration.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (registration && registration.paymentStatus === "PENDING") {
        await prisma.tournamentRegistration.update({
          where: { id: registration.id },
          data: { paymentStatus: "PAID" },
        });

        // ADR-003: Create unified Transaction record
        await createTournamentTransaction(registration.id);

        // ADR-004: Award loyalty points
        const tournament = await prisma.tournament.findUnique({
          where: { id: registration.tournamentId },
          select: { entryFee: true },
        });
        await awardTournamentPoints(
          registration.email,
          registration.id,
          tournament?.entryFee ?? 0,
        );
      }

      return NextResponse.json({ received: true });
    }

    // ── Product order payment (existing flow) ────────────────────
    const order = await prisma.order.findUnique({
      where: { stripeSessionId: session.id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { take: 1 } } } },
            },
          },
        },
      },
    });

    if (order && order.status === "PENDING") {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        }),
        ...order.items.map((item) =>
          prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          }),
        ),
      ]);

      // ── Send order receipt email (non-blocking) ──────────────────
      await sendOrderReceipt({
        to: order.email,
        orderId: order.id,
        items: order.items.map((item) => ({
          name: item.variant.product.name,
          condition: item.variant.condition,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        totalAmount: order.totalAmount,
        orderDate: formatDate(order.createdAt),
      });

      // ADR-003: Create unified Transaction record
      await createOrderTransaction(order.id);

      // ADR-004: Award loyalty points (subtotal only)
      const subtotal = order.items.reduce(
        (s, i) => s + i.unitPrice * i.quantity,
        0,
      );
      await awardOrderPoints(order.email, order.id, subtotal);
    }
  }

  return NextResponse.json({ received: true });
}
