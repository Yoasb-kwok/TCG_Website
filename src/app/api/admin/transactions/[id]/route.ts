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

  // ADR-003 Decision 5: unconstrained transitions — any status to any status
  const transaction = await getPrisma().transaction.update({
    where: { id },
    data,
  });

  return NextResponse.json({ transaction });
}
