import { NextRequest, NextResponse } from "next/server";
import { createReceipt, deleteReceipt, readLedger } from "@/lib/pos-ledger";
import { setReceivedStock, undoReceivedStock } from "@/lib/pos-inventory";

export async function GET() {
  const ledger = await readLedger();
  return NextResponse.json({ receipts: ledger.receipts });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    productId?: string;
    variantId?: string;
    name?: string;
    sku?: string | null;
    quantity?: number;
    unitCost?: number;
    unitPrice?: number;
  } | null;

  const quantity = Math.floor(Number(body?.quantity));
  const unitPrice = Number(body?.unitPrice);
  const variantId = body?.variantId ?? "";
  if (!variantId || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return NextResponse.json({ error: "請填寫數量同售價" }, { status: 400 });
  }

  const stock = await setReceivedStock(variantId, quantity, unitPrice);
  if (!stock) return NextResponse.json({ error: "找不到這件貨" }, { status: 404 });

  const result = await createReceipt({
    productId: body?.productId || stock.productId,
    variantId,
    name: body?.name?.trim() || stock.name,
    sku: body?.sku ?? stock.sku,
    quantity,
    unitCost: Number(body?.unitCost),
    unitPrice,
  });
  if (!result.ok) {
    await undoReceivedStock(variantId, quantity);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ receipt: result.receipt, stock: stock.stock });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const result = await deleteReceipt(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  await undoReceivedStock(result.receipt.variantId, result.receipt.quantity);
  return NextResponse.json({ ok: true });
}
