import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { commitBuyback, listTodayBuybacks, voidBuyback } from "@/lib/pos-buyback-store";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;
  try {
    const buybacks = await listTodayBuybacks();
    return NextResponse.json({ buybacks });
  } catch (error) {
    console.error("GET /api/pos/buyback failed", error);
    return NextResponse.json({ error: "未能讀取收卡紀錄" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;
  const body = (await request.json().catch(() => null)) as {
    variantId?: string | null;
    catalogCardId?: string | null;
    quantity?: number;
    unitBuyPrice?: number;
    customerName?: string;
    customerPhone?: string;
    pokemonId?: string;
    note?: string;
  } | null;

  try {
    const result = await commitBuyback({
      variantId: body?.variantId,
      catalogCardId: body?.catalogCardId,
      quantity: Number(body?.quantity),
      unitBuyPrice: Number(body?.unitBuyPrice),
      customerName: body?.customerName,
      customerPhone: body?.customerPhone,
      pokemonId: body?.pokemonId,
      note: body?.note,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      buyback: result.buyback,
      stock: result.stock,
      createdListing: result.createdListing,
      needsSellPrice: result.needsSellPrice,
    });
  } catch (error) {
    console.error("POST /api/pos/buyback failed", error);
    return NextResponse.json({ error: "未能入帳，請再試一次" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  try {
    const result = await voidBuyback(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/pos/buyback failed", error);
    return NextResponse.json({ error: "未能撤銷，請再試一次" }, { status: 500 });
  }
}
