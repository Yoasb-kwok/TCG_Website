import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { awardOrderPoints } from "@/lib/points";
import { createOrderTransaction } from "@/lib/transactions";
import { isEarnedStatus } from "@/lib/reports";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { id } = await params;
  const { status } = (await request.json()) as { status: string };

  const order = await getPrisma().order.update({
    where: { id },
    data: { status: status as "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED" },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  // ADR-004 Decision 5: Award points when admin manually sets status to PAID
  // (idempotency guard in awardOrderPoints prevents double-award)
  if (status === "PAID") {
    const subtotal = order.items.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0,
    );
    await awardOrderPoints(order.email, order.id, subtotal);
  }

  // ADR-009: ensure the ledger Transaction exists with paidAt for any
  // money-received status (PAID, SHIPPED, COMPLETED — walk-in sales can skip
  // PAID). Idempotent — skips if already created by the Stripe webhook.
  if (isEarnedStatus(status)) {
    await createOrderTransaction(order.id);
  }

  return NextResponse.json({ order });
}
