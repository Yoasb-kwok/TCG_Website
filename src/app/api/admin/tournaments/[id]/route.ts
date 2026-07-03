import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { allowedTransitions } from "@/lib/tournament-status";

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
  const { status } = (await request.json()) as { status?: string };

  const existing = await getPrisma().tournament.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "賽事不存在" },
      { status: 404 },
    );
  }

  const allowed = allowedTransitions(existing.status);
  if (!status || !allowed.includes(status)) {
    return NextResponse.json(
      { error: "無法變更為此狀態" },
      { status: 400 },
    );
  }

  const tournament = await getPrisma().tournament.update({
    where: { id },
    data: {
      status: status as
        | "OPEN"
        | "FULL"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "DRAFT",
    },
    include: { _count: { select: { registrations: true } } },
  });

  return NextResponse.json({ tournament });
}
