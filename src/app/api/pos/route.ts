import { NextRequest, NextResponse } from "next/server";
import { trendWindow } from "@/lib/chart-days";
import { dailySaleTrend, periodRange, readLedger, summarizePnl } from "@/lib/pos-ledger";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "today";
  const { from, to } = periodRange(period);
  const ledger = await readLedger();
  const inRange = (iso: string) => {
    const at = new Date(iso).getTime();
    return at >= from.getTime() && at <= to.getTime();
  };
  const trend = trendWindow();
  return NextResponse.json({
    pnl: summarizePnl(ledger, from, to),
    sales: ledger.sales.filter((sale) => inRange(sale.createdAt)),
    expenses: ledger.expenses.filter((expense) => inRange(expense.createdAt)),
    trend: dailySaleTrend(ledger, trend.from, trend.to),
  });
}
