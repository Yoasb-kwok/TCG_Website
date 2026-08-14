import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { updateGameType, deleteGameType } from "@/lib/game-types";

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
    const gameType = await updateGameType(id, {
      name: body.name,
      slug: body.slug,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
    return NextResponse.json(gameType);
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新失敗";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "此 slug 已存在" }, { status: 409 });
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
    await deleteGameType(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "刪除失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
