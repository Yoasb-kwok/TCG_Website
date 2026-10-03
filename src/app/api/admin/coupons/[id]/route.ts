import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { updateCoupon, deleteCoupon } from "@/lib/coupons";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const coupon = await updateCoupon(id, {
      name: body.name,
      code: body.code,
      description: body.description,
      quantity: body.quantity,
      isActive: body.isActive,
    });
    return NextResponse.json(coupon);
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新失敗";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "此優惠券代碼已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const { id } = await params;

  try {
    await deleteCoupon(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "刪除失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
