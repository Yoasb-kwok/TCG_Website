import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { listCoupons, createCoupon } from "@/lib/coupons";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const coupons = await listCoupons();
    return NextResponse.json(coupons);
  } catch (e) {
    const message = e instanceof Error ? e.message : "讀取失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "請填寫優惠券名稱" }, { status: 400 });
  }

  try {
    const coupon = await createCoupon({
      name: body.name,
      code: body.code?.trim() || undefined,
      description: body.description ?? "",
      quantity: typeof body.quantity === "number" ? body.quantity : 0,
      isActive: body.isActive,
    });
    return NextResponse.json(coupon, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "建立失敗";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "此優惠券代碼已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
