import { NextRequest, NextResponse } from "next/server";
import { createSale, voidSale } from "@/lib/pos-ledger";

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
  return NextResponse.json({ sale: result.sale });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const result = await voidSale(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true });
}
