import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Verify a Stripe Checkout Session for a tournament registration payment.
 *
 * On success, also self-heals: if the registration is still PENDING but
 * Stripe reports the session as paid, flip it to PAID immediately (the
 * webhook may not have fired yet).
 */
export async function GET(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "付款系統尚未設定" },
      { status: 503 },
    );
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

    if (!paid) {
      return NextResponse.json(
        { paid: false, error: "付款尚未完成" },
        { status: 200 },
      );
    }

    // Look up the registration by stripeSessionId
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ paid: true });
    }

    const prisma = getPrisma();
    const registration = await prisma.tournamentRegistration.findUnique({
      where: { stripeSessionId: sessionId },
      include: { tournament: { select: { title: true, slug: true, startsAt: true, location: true } } },
    });

    // Self-heal: Stripe says paid but our DB still says PENDING
    if (registration && registration.paymentStatus === "PENDING") {
      await prisma.tournamentRegistration.update({
        where: { id: registration.id },
        data: { paymentStatus: "PAID" },
      });
    }

    return NextResponse.json({
      paid: true,
      registration: registration
        ? {
            id: registration.id,
            playerName: registration.playerName,
            email: registration.email,
            tournament: registration.tournament,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "無法讀取付款狀態";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
