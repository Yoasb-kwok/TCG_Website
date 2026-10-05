import { NextRequest, NextResponse } from "next/server";
import { adjustStockBySku } from "@/lib/pos-inventory";
import { createSale, readLedger, voidSale } from "@/lib/pos-ledger";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    paymentMethod?: string;
    discount?: number;
    note?: string;
    items?: {
      name: string;
      sku?: string | null;
      quantity: number;
      unitPrice: number;
      unitCost: number;
    }[];
  } | null;

  const result = await createSale({
    paymentMethod: body?.paymentMethod ?? "",
    discount: body?.discount,
    note: body?.note,
    items: body?.items ?? [],
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  for (const item of result.sale.items) {
    await adjustStockBySku(item.sku, -item.quantity);
  }
  return NextResponse.json({ sale: result.sale });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const existing = (await readLedger()).sales.find((sale) => sale.id === id && !sale.voided);
  const result = await voidSale(id);
  if (result.ok && existing) {
    for (const item of existing.items) {
      await adjustStockBySku(item.sku, item.quantity);
    }
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true });
}
