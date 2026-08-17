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
  };
});

import { requireAdmin } from "@/lib/auth-server";
import { fetchMonthlyReport, currentMonthHk } from "@/lib/reports";
import { GET } from "./route";

function makeRequest(query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/reports");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const mockReport = {
  month: "2026-08",
  earned: 150,
  spent: 20,
  net: 130,
  revenueByType: { ORDER: 100, TOURNAMENT: 50 },
  expenses: [
    {
      productName: "Pikachu",
      condition: "NM",
      isFoil: true,
      quantity: 2,
      unitCost: 10,
      total: 20,
      arrivedAt: "2026-08-05",
    },
  ],
};

describe("GET /api/admin/reports", () => {
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

  it("returns the report for the requested month", async () => {
    vi.mocked(fetchMonthlyReport).mockResolvedValue(mockReport);

    const res = await GET(makeRequest({ month: "2026-08" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(fetchMonthlyReport).toHaveBeenCalledWith("2026-08");
    expect(data.month).toBe("2026-08");
    expect(data.earned).toBe(150);
    expect(data.net).toBe(130);
    expect(data.revenueByType).toEqual({ ORDER: 100, TOURNAMENT: 50 });
    expect(data.expenses).toHaveLength(1);
  });

  it("defaults to the current HK month when no month is given", async () => {
    vi.mocked(fetchMonthlyReport).mockResolvedValue(mockReport);

    await GET(makeRequest());

    expect(currentMonthHk).toHaveBeenCalled();
    expect(fetchMonthlyReport).toHaveBeenCalledWith("2026-08");
  });

  it("returns 400 for an invalid month format", async () => {
    const res = await GET(makeRequest({ month: "2026-8" }));
    expect(res.status).toBe(400);
    expect(fetchMonthlyReport).not.toHaveBeenCalled();
  });

  it("returns 503 when the database is not configured", async () => {
    const { isDatabaseConfigured } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);

    const res = await GET(makeRequest({ month: "2026-08" }));
    expect(res.status).toBe(503);
  });
});
