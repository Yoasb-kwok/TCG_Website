import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { createStockRecord } from "@/lib/inventory";

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as {
    variantId?: string;
    quantity?: number;
    unitCost?: number;
  };

  if (!body.variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }
  if (!body.quantity || body.quantity <= 0) {
    return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
  }
  if (body.unitCost == null || body.unitCost < 0) {
    return NextResponse.json({ error: "unitCost must be >= 0" }, { status: 400 });
  }

  try {
    const recordId = await createStockRecord(
      body.variantId,
      body.quantity,
      body.unitCost,
    );
    return NextResponse.json({ recordId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
