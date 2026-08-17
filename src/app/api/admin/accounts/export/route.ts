import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { exportAccountsCsv } from "@/lib/accounts";

/** ADR-008 Decision 8 — CSV export of selected accounts. */
export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const ids = body?.ids;

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !ids.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "請選擇至少一個帳號" },
      { status: 400 },
    );
  }

  try {
    const csv = await exportAccountsCsv(ids);
    // BOM so Excel renders UTF-8 Chinese correctly
    const payload = "\uFEFF" + csv;
    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="accounts.csv"',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "匯出失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
