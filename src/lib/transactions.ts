/**
 * ADR-003: Transaction Management System — Domain Service
 *
 * Creates unified Transaction records from Orders and TournamentRegistrations.
 * Functions are idempotent — safe to call multiple times (webhook retry, etc.).
 */
import { getPrisma } from "@/lib/prisma";
import { isEarnedStatus } from "@/lib/reports";
import type { OrderReceiptData, TournamentReceiptData } from "@/lib/transaction-types";

// ── Receipt snapshot builders ──────────────────────────────────────────

type OrderWithItems = {
  id: string;
  email: string;
  totalAmount: number;
  createdAt: Date;
  items: {
    unitPrice: number;
    quantity: number;
    variant: {
      condition: string;
      product: { name: string };
    };
  }[];
};

type RegistrationWithTournament = {
  id: string;
  email: string;
  playerName: string;
  createdAt: Date;
  tournament: {
    title: string;
    entryFee: number;
    startsAt: Date;
    location: string;
  };
};

export function buildOrderReceiptData(order: OrderWithItems): OrderReceiptData {
  return {
    type: "ORDER",
    orderId: order.id,
    email: order.email,
    items: order.items.map((item) => ({
      name: item.variant.product.name,
      condition: item.variant.condition,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    totalAmount: order.totalAmount,
    date: order.createdAt.toISOString(),
  };
}

export function buildTournamentReceiptData(
  reg: RegistrationWithTournament,
): TournamentReceiptData {
  return {
    type: "TOURNAMENT",
    tournamentTitle: reg.tournament.title,
    playerName: reg.playerName,
    entryFee: reg.tournament.entryFee,
    startsAt: reg.tournament.startsAt.toISOString(),
    location: reg.tournament.location,
    date: reg.createdAt.toISOString(),
  };
}

// ── Transaction creators (idempotent) ──────────────────────────────────

export async function createOrderTransaction(orderId: string): Promise<void> {
  const prisma = getPrisma();

  // Idempotency: skip if Transaction already exists for this order
  const existing = await prisma.transaction.findFirst({
    where: { type: "ORDER", referenceId: orderId },
  });
  if (existing) return;

  // Fetch order with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  if (!order) return;

  // Determine buyer type and customer name
  const buyerType = order.userId ? "USER" : "GUEST";
  let customerName: string | null = null;

  if (order.userId) {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { name: true },
    });
    customerName = user?.name ?? null;
  }

  const description = order.items
    .map((i) => i.variant.product.name)
    .join(", ");

  const receiptData = buildOrderReceiptData({
    id: order.id,
    email: order.email,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      variant: {
        condition: i.variant.condition,
        product: { name: i.variant.product.name },
      },
    })),
  });

  // ADR-009 Decision 3: paidAt set when created with a money-received status
  const paidAt = isEarnedStatus(order.status) ? new Date() : undefined;

  await prisma.transaction.create({
    data: {
      type: "ORDER",
      referenceId: orderId,
      buyerType,
      email: order.email,
      customerName,
      description,
      amount: order.totalAmount,
      status: order.status,
      paidAt,
      receiptData: receiptData as never,
    },
  });
}

export async function createTournamentTransaction(
  registrationId: string,
): Promise<void> {
  const prisma = getPrisma();

  // Idempotency: skip if Transaction already exists
  const existing = await prisma.transaction.findFirst({
    where: { type: "TOURNAMENT", referenceId: registrationId },
  });
  if (existing) return;

  // Fetch registration with tournament
  const reg = await prisma.tournamentRegistration.findUnique({
    where: { id: registrationId },
    include: {
      tournament: {
        select: {
          id: true,
          title: true,
          entryFee: true,
          startsAt: true,
          location: true,
        },
      },
    },
  });

  if (!reg) return;

  // Tournament: customerName is always playerName (always present)
  const buyerType = reg.userId ? "USER" : "GUEST";

  const receiptData = buildTournamentReceiptData({
    id: reg.id,
    email: reg.email,
    playerName: reg.playerName,
    createdAt: reg.createdAt,
    tournament: {
      title: reg.tournament.title,
      entryFee: reg.tournament.entryFee,
      startsAt: reg.tournament.startsAt,
      location: reg.tournament.location,
    },
  });

  // ADR-009 Decision 3: paidAt set when created as PAID
  const status = reg.paymentStatus === "PAID" ? "PAID" : "PENDING";
  const paidAt = isEarnedStatus(status) ? new Date() : undefined;

  await prisma.transaction.create({
    data: {
      type: "TOURNAMENT",
      referenceId: registrationId,
      buyerType,
      email: reg.email,
      customerName: reg.playerName,
      description: reg.tournament.title,
      amount: reg.tournament.entryFee,
      status,
      paidAt,
      receiptData: receiptData as never,
    },
  });
}
