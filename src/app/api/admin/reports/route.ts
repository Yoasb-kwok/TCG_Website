import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { fetchMonthlyReport, currentMonthHk, isValidMonth } from "@/lib/reports";

/** ADR-009 Decision 5/6: monthly revenue report JSON. */
export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const month = request.nextUrl.searchParams.get("month") ?? currentMonthHk();

  if (!isValidMonth(month)) {
    return NextResponse.json(
      { error: "無效的月份格式，應為 YYYY-MM" },
      { status: 400 },
    );
  }

  try {
    const report = await fetchMonthlyReport(month);
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "無法取得報告";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
