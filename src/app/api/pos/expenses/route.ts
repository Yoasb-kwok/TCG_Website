import { NextRequest, NextResponse } from "next/server";
import { createExpense, deleteExpense } from "@/lib/pos-ledger";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    category?: string;
    amount?: number;
    note?: string;
    createdAt?: string;
  } | null;

  const result = await createExpense({
    category: body?.category ?? "",
    amount: Number(body?.amount),
    note: body?.note,
    createdAt: body?.createdAt,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ expense: result.expense });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "找不到這項開支" }, { status: 400 });
  await deleteExpense(id);
  return NextResponse.json({ ok: true });
}
