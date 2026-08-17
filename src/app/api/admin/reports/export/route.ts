import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  fetchMonthlyReport,
  currentMonthHk,
  isValidMonth,
  buildReportCsv,
} from "@/lib/reports";

/** ADR-009 Decision 7: CSV export of a monthly report. */
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
    const csv = buildReportCsv(report);
    // BOM so Excel renders UTF-8 Chinese correctly
    const payload = "\uFEFF" + csv;
    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="revenue-report-${month}.csv"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "匯出失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
