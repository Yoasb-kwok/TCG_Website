import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  reserveStock,
  unreserveStock,
  clearReservedStock,
  manualAdjustActual,
} from "@/lib/inventory";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const { variantId } = await params;
  const body = (await request.json()) as {
    action: string;
    quantity?: number;
    note?: string;
  };

  try {
    switch (body.action) {
      case "increase":
        if (!body.quantity || body.quantity <= 0) {
          return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
        }
        await manualAdjustActual(variantId, body.quantity);
        break;

      case "decrease":
        if (!body.quantity || body.quantity <= 0) {
          return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
        }
        await manualAdjustActual(variantId, -body.quantity);
        break;

      case "reserve":
        if (!body.quantity || body.quantity <= 0) {
          return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
        }
        await reserveStock(variantId, body.quantity, body.note);
        break;

      case "unreserve":
        if (!body.quantity || body.quantity <= 0) {
          return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
        }
        await unreserveStock(variantId, body.quantity);
        break;

      case "clearReserved":
        await clearReservedStock(variantId);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${body.action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
