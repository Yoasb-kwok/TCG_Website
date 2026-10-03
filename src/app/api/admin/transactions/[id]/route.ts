import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isEarnedStatus } from "@/lib/reports";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    remark?: string;
  };

  // Build update data — only include fields that were sent
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.remark !== undefined) data.remark = body.remark;

  // ADR-009 Decision 3: paidAt is set when status enters a money-received
  // status from a non-money status (e.g. PENDING→PAID, CANCELLED→PAID after
  // refund reversal). Moving between money statuses (PAID→SHIPPED) keeps the
  // original payment moment.
  if (body.status !== undefined) {
    const current = await getPrisma().transaction.findUnique({
      where: { id },
      select: { status: true },
    });
    if (current && isEarnedStatus(body.status) && !isEarnedStatus(current.status)) {
      data.paidAt = new Date();
    }
  }

  // ADR-003 Decision 5: unconstrained transitions — any status to any status
  const transaction = await getPrisma().transaction.update({
    where: { id },
    data,
  });

  return NextResponse.json({ transaction });
}
