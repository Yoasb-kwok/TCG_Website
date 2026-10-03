import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  updateProfile,
  softDeleteAccount,
  undeleteAccount,
} from "@/lib/accounts";

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
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  try {
    // deletedAt: null → undelete (ADR-008 Decision 7)
    if ("deletedAt" in body && body.deletedAt === null) {
      const user = await undeleteAccount(id);
      return NextResponse.json(user);
    }

    const input: { name?: string; phone?: string } = {};
    if (typeof body.name === "string") input.name = body.name;
    if (typeof body.phone === "string") input.phone = body.phone;

    const user = await updateProfile(id, input);
    return NextResponse.json(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新失敗";
    if (message.includes("不存在")) {
      return NextResponse.json({ error: message }, { status: 404 });
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
    const user = await softDeleteAccount(id);
    return NextResponse.json({ success: true, id: user.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "刪除失敗";
    if (message.includes("不存在")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
