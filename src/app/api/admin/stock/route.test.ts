import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/inventory", () => ({
  createStockRecord: vi.fn(),
  arriveStockRecord: vi.fn(),
}));

import { POST as StockPOST } from "@/app/api/admin/stock/route";
import { GET as RecordsGET } from "@/app/api/admin/stock-records/route";
import { PATCH as RecordPATCH } from "@/app/api/admin/stock-records/[id]/route";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import { createStockRecord, arriveStockRecord } from "@/lib/inventory";

beforeEach(() => vi.clearAllMocks());

function mockAdminOk() {
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: true as const,
    session: { user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" } },
  } as never);
}

function mockAdminFail() {
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: false as const,
    response: new Response("Unauthorized", { status: 401 }),
  } as never);
}

function mockPrisma() {
  const m = {
    stockRecord: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
  vi.mocked(getPrisma).mockReturnValue(m as never);
  return m;
}

function makeReqWithBody(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

function makeReqWithParams(params: URLSearchParams) {
  return {
    nextUrl: { searchParams: params },
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// POST /api/admin/stock
// ---------------------------------------------------------------------------

describe("POST /api/admin/stock", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const req = makeReqWithBody({ variantId: "v1", quantity: 5, unitCost: 10 });
    const res = await StockPOST(req);
    expect(res.status).toBe(401);
  });

  it("creates StockRecord and returns recordId", async () => {
    mockAdminOk();
    vi.mocked(createStockRecord).mockResolvedValue("rec-1");

    const req = makeReqWithBody({ variantId: "v1", quantity: 10, unitCost: 15.5 });
    const res = await StockPOST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.recordId).toBe("rec-1");
    expect(createStockRecord).toHaveBeenCalledWith("v1", 10, 15.5);
  });

  it("returns 400 for missing variantId", async () => {
    mockAdminOk();
    const req = makeReqWithBody({ quantity: 10, unitCost: 15 });
    const res = await StockPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing quantity", async () => {
    mockAdminOk();
    const req = makeReqWithBody({ variantId: "v1", unitCost: 15 });
    const res = await StockPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing unitCost", async () => {
    mockAdminOk();
    const req = makeReqWithBody({ variantId: "v1", quantity: 10 });
    const res = await StockPOST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/stock-records
// ---------------------------------------------------------------------------

describe("GET /api/admin/stock-records", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const req = makeReqWithParams(new URLSearchParams());
    const res = await RecordsGET(req);
    expect(res.status).toBe(401);
  });

  it("returns records with product name", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.stockRecord.findMany.mockResolvedValue([
      {
        id: "rec-1",
        variantId: "v1",
        quantity: 10,
        unitCost: 15.5,
        state: "BOOKED",
        bookedAt: new Date(),
        arrivedAt: null,
        arrivalNote: null,
        variant: {
          id: "v1",
          condition: "NM",
          isFoil: false,
          product: { id: "p1", name: "Pikachu ex" },
        },
      },
    ] as never);
    prisma.stockRecord.count.mockResolvedValue(1 as never);

    const req = makeReqWithParams(new URLSearchParams());
    const res = await RecordsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].variant.product.name).toBe("Pikachu ex");
  });

  it("filters by state (BOOKED)", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.stockRecord.findMany.mockResolvedValue([] as never);
    prisma.stockRecord.count.mockResolvedValue(0 as never);

    const params = new URLSearchParams();
    params.set("state", "BOOKED");
    const req = makeReqWithParams(params);
    await RecordsGET(req);

    expect(prisma.stockRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ state: "BOOKED" }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/stock-records/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/stock-records/[id]", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const req = makeReqWithBody({ arrivedAt: "2026-08-14T10:00:00Z" });
    const res = await RecordPATCH(req, { params: Promise.resolve({ id: "rec-1" }) });
    expect(res.status).toBe(401);
  });

  it("toggles BOOKED → ARRIVED", async () => {
    mockAdminOk();
    vi.mocked(arriveStockRecord).mockResolvedValue(undefined);

    const req = makeReqWithBody({
      arrivedAt: "2026-08-14T10:00:00Z",
      note: "good condition",
    });
    const res = await RecordPATCH(req, { params: Promise.resolve({ id: "rec-1" }) });

    expect(res.status).toBe(200);
    expect(arriveStockRecord).toHaveBeenCalledWith(
      "rec-1",
      new Date("2026-08-14T10:00:00Z"),
      "good condition",
    );
  });

  it("returns 400 when arrivedAt missing", async () => {
    mockAdminOk();
    const req = makeReqWithBody({ note: "test" });
    const res = await RecordPATCH(req, { params: Promise.resolve({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });
});
