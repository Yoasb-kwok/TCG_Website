import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reports")>();
  return {
    ...actual,
    fetchMonthlyReport: vi.fn(),
    currentMonthHk: vi.fn(),
    buildReportCsv: vi.fn(),
  };
});

import { requireAdmin } from "@/lib/auth-server";
import { fetchMonthlyReport, currentMonthHk, buildReportCsv } from "@/lib/reports";
import { GET } from "./route";

function makeRequest(query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/reports/export");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const mockReport = {
  month: "2026-08",
  earned: 150,
  spent: 20,
  net: 130,
  revenueByType: { ORDER: 100, TOURNAMENT: 50 },
  expenses: [],
};

describe("GET /api/admin/reports/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true as const,
      session: { user: { id: "admin-1", role: "ADMIN" } } as never,
    } as never);
    vi.mocked(currentMonthHk).mockReturnValue("2026-08");
  });

  it("returns 401 without admin auth", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false as const,
      response: { status: 401 } as never,
    } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns a CSV attachment with BOM for UTF-8 Chinese", async () => {
    vi.mocked(fetchMonthlyReport).mockResolvedValue(mockReport);
    vi.mocked(buildReportCsv).mockReturnValue("月份,2026-08\n收入,150");

    const res = await GET(makeRequest({ month: "2026-08" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="revenue-report-2026-08.csv"',
    );
    // BOM prefix so Excel renders Chinese correctly — check raw UTF-8 bytes
    // (res.text() strips a leading BOM, so use arrayBuffer)
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    expect(new TextDecoder().decode(bytes.subarray(3))).toContain("月份,2026-08");
  });

  it("defaults to the current HK month when no month is given", async () => {
    vi.mocked(fetchMonthlyReport).mockResolvedValue(mockReport);
    vi.mocked(buildReportCsv).mockReturnValue("");

    await GET(makeRequest());

    expect(fetchMonthlyReport).toHaveBeenCalledWith("2026-08");
  });

  it("returns 400 for an invalid month format", async () => {
    const res = await GET(makeRequest({ month: "abc" }));
    expect(res.status).toBe(400);
    expect(fetchMonthlyReport).not.toHaveBeenCalled();
  });
});
