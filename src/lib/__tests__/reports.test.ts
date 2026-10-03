import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

import { getPrisma } from "@/lib/prisma";
import {
  EARNED_STATUSES,
  isEarnedStatus,
  isValidMonth,
  getMonthRange,
  currentMonthHk,
  buildReport,
  fetchMonthlyReport,
  buildReportCsv,
} from "../reports";

// ── Pure helpers ──────────────────────────────────────────────────────────

describe("EARNED_STATUSES / isEarnedStatus", () => {
  it("counts PAID, SHIPPED, COMPLETED, NOT_REQUIRED as earned", () => {
    expect(EARNED_STATUSES).toEqual([
      "PAID",
      "SHIPPED",
      "COMPLETED",
      "NOT_REQUIRED",
    ]);
    expect(isEarnedStatus("PAID")).toBe(true);
    expect(isEarnedStatus("SHIPPED")).toBe(true);
    expect(isEarnedStatus("COMPLETED")).toBe(true);
    expect(isEarnedStatus("NOT_REQUIRED")).toBe(true);
  });

  it("does not count PENDING, CANCELLED, FAILED", () => {
    expect(isEarnedStatus("PENDING")).toBe(false);
    expect(isEarnedStatus("CANCELLED")).toBe(false);
    expect(isEarnedStatus("FAILED")).toBe(false);
  });
});

describe("getMonthRange (Asia/Hong_Kong, UTC+8, no DST)", () => {
  it("returns HK month boundaries for a mid-year month", () => {
    const { start, end } = getMonthRange("2026-08");
    // Aug 1 00:00 HKT = Jul 31 16:00 UTC
    expect(start.toISOString()).toBe("2026-07-31T16:00:00.000Z");
    // Sep 1 00:00 HKT = Aug 31 16:00 UTC
    expect(end.toISOString()).toBe("2026-08-31T16:00:00.000Z");
  });

  it("handles December → January year rollover", () => {
    const { start, end } = getMonthRange("2026-12");
    expect(start.toISOString()).toBe("2026-11-30T16:00:00.000Z");
    // Jan 1 2027 00:00 HKT = Dec 31 2026 16:00 UTC
    expect(end.toISOString()).toBe("2026-12-31T16:00:00.000Z");
  });

  it("rejects invalid month strings", () => {
    expect(() => getMonthRange("2026-13")).toThrow();
    expect(() => getMonthRange("2026-0")).toThrow();
    expect(() => getMonthRange("2026-8")).toThrow();
    expect(() => getMonthRange("abc")).toThrow();
    expect(() => getMonthRange("")).toThrow();
  });

  it("isValidMonth accepts YYYY-MM and rejects malformed strings", () => {
    expect(isValidMonth("2026-08")).toBe(true);
    expect(isValidMonth("2026-12")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-8")).toBe(false);
    expect(isValidMonth("202608")).toBe(false);
    expect(isValidMonth("")).toBe(false);
    // 2-digit-style years would be remapped by Date.UTC (0099 → 1999)
    expect(isValidMonth("0099-08")).toBe(false);
  });
});

describe("currentMonthHk", () => {
  it("returns the HK calendar month for the current instant", () => {
    vi.useFakeTimers();
    // HK = UTC+8
    vi.setSystemTime(new Date("2026-08-17T10:00:00Z")); // HK Aug 17 18:00
    expect(currentMonthHk()).toBe("2026-08");

    vi.setSystemTime(new Date("2026-08-31T20:00:00Z")); // HK Sep 1 04:00
    expect(currentMonthHk()).toBe("2026-09");

    vi.setSystemTime(new Date("2026-01-01T00:30:00Z")); // HK Jan 1 08:30
    expect(currentMonthHk()).toBe("2026-01");

    vi.useRealTimers();
  });
});

// ── Pure aggregation ──────────────────────────────────────────────────────

const txn = (
  type: "ORDER" | "TOURNAMENT",
  amount: number,
  status: string,
) => ({ type, amount, status });

const stock = (
  productName: string,
  quantity: number,
  unitCost: number,
  arrivedAtISO: string,
  variantCondition = "NM",
  variantIsFoil = false,
) => ({
  productName,
  quantity,
  unitCost,
  arrivedAt: new Date(arrivedAtISO),
  variantCondition,
  variantIsFoil,
});

describe("buildReport", () => {
  it("sums only money-received statuses into earned", () => {
    const report = buildReport("2026-08", [
      txn("ORDER", 100, "PAID"),
      txn("ORDER", 50, "SHIPPED"),
      txn("TOURNAMENT", 30, "COMPLETED"),
      txn("ORDER", 20, "NOT_REQUIRED"),
      txn("ORDER", 999, "PENDING"),
      txn("ORDER", 999, "CANCELLED"),
      txn("ORDER", 999, "FAILED"),
    ], []);
    expect(report.earned).toBe(200);
  });

  it("splits revenue by type", () => {
    const report = buildReport("2026-08", [
      txn("ORDER", 100, "PAID"),
      txn("TOURNAMENT", 40, "PAID"),
      txn("ORDER", 60, "NOT_REQUIRED"),
    ], []);
    expect(report.revenueByType.ORDER).toBe(160);
    expect(report.revenueByType.TOURNAMENT).toBe(40);
  });

  it("computes spent from quantity × unitCost", () => {
    const report = buildReport("2026-08", [], [
      stock("Pikachu", 2, 10, "2026-08-05T00:00:00Z"),
      stock("Charizard", 1, 25, "2026-08-10T00:00:00Z"),
    ]);
    expect(report.spent).toBe(45);
  });

  it("net = earned − spent", () => {
    const report = buildReport("2026-08", [txn("ORDER", 300, "PAID")], [
      stock("Pikachu", 10, 5, "2026-08-05T00:00:00Z"),
    ]);
    expect(report.net).toBe(250);
  });

  it("rounds monetary values to 2 decimals", () => {
    const report = buildReport("2026-08", [txn("ORDER", 0.1 + 0.2, "PAID")], [
      stock("Pikachu", 3, 0.1, "2026-08-05T00:00:00Z"), // 0.30000000000000004
    ]);
    expect(report.earned).toBe(0.3);
    expect(report.spent).toBe(0.3);
    expect(report.net).toBe(0);
  });

  it("maps expense rows with line totals and arrival date", () => {
    const report = buildReport("2026-08", [], [
      stock("Pikachu", 2, 10, "2026-08-05T03:00:00Z", "NM", true),
    ]);
    expect(report.expenses).toHaveLength(1);
    expect(report.expenses[0]).toEqual({
      productName: "Pikachu",
      condition: "NM",
      isFoil: true,
      quantity: 2,
      unitCost: 10,
      total: 20,
      arrivedAt: "2026-08-05",
    });
  });

  it("sorts expense rows chronologically", () => {
    const report = buildReport("2026-08", [], [
      stock("Charizard", 1, 25, "2026-08-20T00:00:00Z"),
      stock("Pikachu", 2, 10, "2026-08-05T00:00:00Z"),
    ]);
    expect(report.expenses.map((e) => e.productName)).toEqual([
      "Pikachu",
      "Charizard",
    ]);
  });

  it("returns zeros for empty inputs", () => {
    const report = buildReport("2026-08", [], []);
    expect(report).toEqual({
      month: "2026-08",
      earned: 0,
      spent: 0,
      net: 0,
      revenueByType: { ORDER: 0, TOURNAMENT: 0 },
      expenses: [],
    });
  });
});

// ── DB fetch ──────────────────────────────────────────────────────────────

function makeMockPrisma(
  transactions: unknown[] = [],
  stockRecords: unknown[] = [],
) {
  return {
    transaction: { findMany: vi.fn().mockResolvedValue(transactions) },
    stockRecord: { findMany: vi.fn().mockResolvedValue(stockRecords) },
  };
}

describe("fetchMonthlyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries transactions by paidAt range + earned statuses", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await fetchMonthlyReport("2026-08");

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["PAID", "SHIPPED", "COMPLETED", "NOT_REQUIRED"] },
        paidAt: {
          gte: new Date("2026-07-31T16:00:00.000Z"),
          lt: new Date("2026-08-31T16:00:00.000Z"),
        },
      },
      select: { type: true, amount: true, status: true },
    });
  });

  it("queries stock records by arrivedAt range + ARRIVED state", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await fetchMonthlyReport("2026-08");

    expect(mockPrisma.stockRecord.findMany).toHaveBeenCalledWith({
      where: {
        state: "ARRIVED",
        arrivedAt: {
          gte: new Date("2026-07-31T16:00:00.000Z"),
          lt: new Date("2026-08-31T16:00:00.000Z"),
        },
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
    });
  });

  it("returns the aggregated report", async () => {
    const mockPrisma = makeMockPrisma(
      [txn("ORDER", 100, "PAID"), txn("TOURNAMENT", 50, "PAID")],
      [stock("Pikachu", 2, 10, "2026-08-05T00:00:00Z")],
    );
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    const report = await fetchMonthlyReport("2026-08");

    expect(report.month).toBe("2026-08");
    expect(report.earned).toBe(150);
    expect(report.spent).toBe(20);
    expect(report.net).toBe(130);
    expect(report.revenueByType).toEqual({ ORDER: 100, TOURNAMENT: 50 });
    expect(report.expenses).toHaveLength(1);
  });

  it("throws on invalid month", async () => {
    await expect(fetchMonthlyReport("nope")).rejects.toThrow();
  });
});

// ── CSV ───────────────────────────────────────────────────────────────────

describe("buildReportCsv", () => {
  const report = buildReport(
    "2026-08",
    [txn("ORDER", 100, "PAID"), txn("TOURNAMENT", 50, "PAID")],
    [stock("Pikachu", 2, 10, "2026-08-05T00:00:00Z", "NM", true)],
  );

  it("includes summary rows", () => {
    const csv = buildReportCsv(report);
    expect(csv).toContain("月份,2026-08");
    expect(csv).toContain("收入,150");
    expect(csv).toContain("支出,20");
    expect(csv).toContain("淨利,130");
  });

  it("includes revenue split", () => {
    const csv = buildReportCsv(report);
    expect(csv).toContain("產品訂單,100");
    expect(csv).toContain("賽事,50");
  });

  it("includes one row per expense record", () => {
    const csv = buildReportCsv(report);
    expect(csv).toContain("Pikachu,NM,是,2,10,20,2026-08-05");
  });

  it("handles expense-free months", () => {
    const empty = buildReport("2026-08", [], []);
    const csv = buildReportCsv(empty);
    expect(csv).toContain("收入,0");
    expect(csv).toContain("淨利,0");
  });
});
