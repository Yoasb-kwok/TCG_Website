import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { reverseEmailChange } from "@/lib/accounts";

/**
 * ADR-008 Decision 2 — Reverse button (admin undo during PENDING).
 * Restores User.email to oldEmail; request row kept as audit (REVERSED).
 */
export async function POST(
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
    const user = await reverseEmailChange(id);
    return NextResponse.json(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "無法還原電郵變更";
    if (message.includes("沒有進行中")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
