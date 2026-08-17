import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { initiateEmailChange } from "@/lib/accounts";

/**
 * ADR-008 Decision 2 — State 1.
 * Admin initiates the change: User.email flips immediately,
 * the old email is stored in the request row for reversal.
 */
export async function POST(
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
  const newEmail = body?.newEmail;

  if (typeof newEmail !== "string" || !newEmail.trim()) {
    return NextResponse.json({ error: "請填寫新電郵" }, { status: 400 });
  }

  try {
    const req = await initiateEmailChange(id, newEmail);
    return NextResponse.json(req, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "無法啟動電郵變更";
    if (message.includes("已被其他帳號使用") || message.includes("已有進行中")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("不存在")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
