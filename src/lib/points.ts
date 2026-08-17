import { getPrisma } from "@/lib/prisma";
import { POINTS_RATE } from "@/lib/points-constants";

export { POINTS_RATE };

/**
 * Award points for a product order.
 * Idempotent: skips if an ORDER_EARN entry already exists for this orderId.
 */
export async function awardOrderPoints(
  email: string,
  orderId: string,
  subtotal: number,
): Promise<void> {
  const points = Math.floor(subtotal * POINTS_RATE);
  if (points <= 0) return;

  const prisma = getPrisma();
  const existing = await prisma.pointLedger.findFirst({
    where: { referenceId: orderId, reason: "ORDER_EARN" },
  });
  if (existing) return;

  await prisma.pointLedger.create({
    data: { email, delta: points, reason: "ORDER_EARN", referenceId: orderId },
  });
}

/**
 * Award points for a tournament registration.
 * Idempotent: skips if a TOURNAMENT_EARN entry already exists for this registrationId.
 * Free tournaments ($0) earn 0 points — no ledger entry is created.
 */
export async function awardTournamentPoints(
  email: string,
  registrationId: string,
  entryFee: number,
): Promise<void> {
  const points = Math.floor(entryFee * POINTS_RATE);
  if (points <= 0) return;

  const prisma = getPrisma();
  const existing = await prisma.pointLedger.findFirst({
    where: { referenceId: registrationId, reason: "TOURNAMENT_EARN" },
  });
  if (existing) return;

  await prisma.pointLedger.create({
    data: {
      email,
      delta: points,
      reason: "TOURNAMENT_EARN",
      referenceId: registrationId,
    },
  });
}

/**
 * Get the current points balance for an email.
 * Balance = SUM(delta) floored at 0 (ADR-004 Decision 10).
 */
export async function getPointsBalance(email: string): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.pointLedger.aggregate({
    where: { email },
    _sum: { delta: true },
  });
  return Math.max(0, result._sum.delta ?? 0);
}

/**
 * Admin sets an absolute target balance.
 * Computes delta = target - current, inserts one ADMIN_ADJUST ledger entry.
 * Requires a non-empty reason note (ADR-004 Decision 7).
 */
export async function adminSetPoints(
  email: string,
  target: number,
  note: string,
  adminId: string,
): Promise<void> {
  if (!note.trim()) throw new Error("Reason required");

  const clampedTarget = Math.max(0, Math.floor(target));
  const current = await getPointsBalance(email);
  const delta = clampedTarget - current;
  if (delta === 0) return;

  const prisma = getPrisma();
  await prisma.pointLedger.create({
    data: {
      email,
      delta,
      reason: "ADMIN_ADJUST",
      referenceId: adminId,
      note,
    },
  });
}
