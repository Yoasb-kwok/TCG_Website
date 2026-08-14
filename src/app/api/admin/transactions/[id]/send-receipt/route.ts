import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendTransactionReceipt } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { id } = await params;
  const transaction = await getPrisma().transaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    return NextResponse.json({ error: "交易不存在" }, { status: 404 });
  }

  if (!transaction.receiptData) {
    return NextResponse.json({ error: "此交易沒有收據資料" }, { status: 404 });
  }

  // Send receipt email — graceful failure (returns success: false, not error)
  const success = await sendTransactionReceipt({
    to: transaction.email,
    receiptData: transaction.receiptData as never,
  });

  return NextResponse.json({ success });
}
