import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

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

  return NextResponse.json({ order });
}
