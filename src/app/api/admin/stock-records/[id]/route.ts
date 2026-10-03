import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { arriveStockRecord } from "@/lib/inventory";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const { id } = await params;
  const body = (await request.json()) as {
    arrivedAt?: string;
    note?: string;
  };

  if (!body.arrivedAt) {
    return NextResponse.json({ error: "arrivedAt is required" }, { status: 400 });
  }

  try {
    await arriveStockRecord(id, new Date(body.arrivedAt), body.note);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
