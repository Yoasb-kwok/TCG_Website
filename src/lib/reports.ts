/**
 * ADR-009: Monthly Revenue Report — Domain Service
 *
 * Pure aggregation over the Transaction ledger (ADR-003) and StockRecords
 * (ADR-005). The report owns no data of its own; it is a live read-side
 * computation (ADR-009 Decision 4).
 *
 * Month boundaries are Asia/Hong_Kong (UTC+8, no DST).
 */
import { stringify } from "csv-stringify/sync";
import { getPrisma } from "@/lib/prisma";

/** ADR-009 Decision 1: statuses where money was actually received */
export const EARNED_STATUSES = [
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "NOT_REQUIRED",
] as const;

export function isEarnedStatus(status: string): boolean {
  return (EARNED_STATUSES as readonly string[]).includes(status);
}

const HK_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

// 4-digit year starting 1000+ — avoids Date.UTC remapping 2-digit years
const MONTH_PATTERN = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/;

/** True if month is a valid "YYYY-MM" string */
export function isValidMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

/**
 * Get [start, end) UTC Date boundaries for a "YYYY-MM" month in HK time.
 * Example: "2026-08" → [2026-07-31T16:00:00Z, 2026-08-31T16:00:00Z)
 */
export function getMonthRange(month: string): { start: Date; end: Date } {
  if (!isValidMonth(month)) {
    throw new Error("Invalid month format, expected YYYY-MM");
  }
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1) - HK_OFFSET_MS);
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) - HK_OFFSET_MS);
  return { start, end };
}

/** Current calendar month ("YYYY-MM") in Hong Kong time */
export function currentMonthHk(): string {
  return new Date(Date.now() + HK_OFFSET_MS).toISOString().slice(0, 7);
}

// ── Types ────────────────────────────────────────────────────────────────

export type ReportTransaction = {
  type: "ORDER" | "TOURNAMENT";
  amount: number;
  status: string;
};

export type ReportStockRecord = {
  productName: string;
  variantCondition: string;
  variantIsFoil: boolean;
  quantity: number;
  unitCost: number;
  arrivedAt: Date;
};

export type ExpenseRow = {
  productName: string;
  condition: string;
  isFoil: boolean;
  quantity: number;
  unitCost: number;
  total: number;
  arrivedAt: string; // YYYY-MM-DD
};

export type MonthlyReport = {
  month: string;
  earned: number;
  spent: number;
  net: number;
  revenueByType: { ORDER: number; TOURNAMENT: number };
  expenses: ExpenseRow[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pure aggregation: earned revenue (money-received statuses only),
 * spent (arrived stock cost), net, and expense detail rows.
 */
export function buildReport(
  month: string,
  transactions: ReportTransaction[],
  stockRecords: ReportStockRecord[],
): MonthlyReport {
  const revenueByType = { ORDER: 0, TOURNAMENT: 0 };
  let earned = 0;
  for (const t of transactions) {
    if (!isEarnedStatus(t.status)) continue;
    earned += t.amount;
    revenueByType[t.type] += t.amount;
  }

  let spent = 0;
  const expenses: ExpenseRow[] = [...stockRecords]
    .sort((a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime())
    .map((r) => {
      const total = r.quantity * r.unitCost;
      spent += total;
      return {
        productName: r.productName,
        condition: r.variantCondition,
        isFoil: r.variantIsFoil,
        quantity: r.quantity,
        unitCost: r.unitCost,
        total: round2(total),
        arrivedAt: r.arrivedAt.toISOString().slice(0, 10),
      };
    });

  return {
    month,
    earned: round2(earned),
    spent: round2(spent),
    net: round2(earned - spent),
    revenueByType: {
      ORDER: round2(revenueByType.ORDER),
      TOURNAMENT: round2(revenueByType.TOURNAMENT),
    },
    expenses,
  };
}

/**
 * Fetch raw rows for the given month and aggregate.
 * Queries are live reads — no snapshots (ADR-009 Decision 4).
 */
export async function fetchMonthlyReport(month: string): Promise<MonthlyReport> {
  const { start, end } = getMonthRange(month); // validates month

  const prisma = getPrisma();
  const [transactions, stockRecords] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        status: { in: [...EARNED_STATUSES] },
        paidAt: { gte: start, lt: end },
      },
      select: { type: true, amount: true, status: true },
    }),
    prisma.stockRecord.findMany({
      where: {
        state: "ARRIVED",
        arrivedAt: { gte: start, lt: end },
      },
      orderBy: { arrivedAt: "asc" },
      select: {
        productName: true,
        variantCondition: true,
        variantIsFoil: true,
        quantity: true,
        unitCost: true,
        arrivedAt: true,
      },
    }),
  ]);

  // state=ARRIVED implies arrivedAt is set, but the schema type is nullable —
  // filter defensively so buildReport receives concrete Dates
  const arrivedStock = stockRecords.filter(
    (r): r is ReportStockRecord => r.arrivedAt !== null,
  );

  return buildReport(month, transactions, arrivedStock);
}

// ── CSV export ───────────────────────────────────────────────────────────

const csvOptions = { record_delimiter: "\n" } as const;

/**
 * Build the CSV for a monthly report (ADR-009 Decision 7).
 * BOM is added by the API route (accounts pattern).
 */
export function buildReportCsv(report: MonthlyReport): string {
  const summary = stringify(
    [
      ["月份", report.month],
      ["收入", report.earned],
      ["支出", report.spent],
      ["淨利", report.net],
    ],
    csvOptions,
  );

  const revenue = stringify(
    [
      ["類型", "收入金額"],
      ["產品訂單", report.revenueByType.ORDER],
      ["賽事", report.revenueByType.TOURNAMENT],
    ],
    csvOptions,
  );

  const expenses = stringify(
    [
      ["產品", "狀態", "閃卡", "數量", "單價", "總計", "到貨日期"],
      ...report.expenses.map((e) => [
        e.productName,
        e.condition,
        e.isFoil ? "是" : "否",
        e.quantity,
        e.unitCost,
        e.total,
        e.arrivedAt,
      ]),
    ],
    csvOptions,
  );

  return [summary, revenue, expenses].join("\n");
}
