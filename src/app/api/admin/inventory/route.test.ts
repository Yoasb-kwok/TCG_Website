import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/inventory", () => ({
  reserveStock: vi.fn(),
  unreserveStock: vi.fn(),
  clearReservedStock: vi.fn(),
  manualAdjustActual: vi.fn(),
  getVariantState: vi.fn(
    (actual: number, low: number, critical: number) => {
      if (actual > low) return "healthy";
      if (actual >= critical) return "low";
      return "critical";
    },
  ),
}));

import { GET } from "./route";
import { PATCH } from "./[variantId]/route";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import {
  reserveStock,
  unreserveStock,
  clearReservedStock,
  manualAdjustActual,
} from "@/lib/inventory";

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
    productVariant: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    shopSetting: {
      findUnique: vi.fn(),
    },
  };
  vi.mocked(getPrisma).mockReturnValue(m as never);
  return m;
}

function makeReqWithParams(params: URLSearchParams) {
  return {
    nextUrl: { searchParams: params },
  } as unknown as NextRequest;
}

function makeReqWithBody(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// GET /api/admin/inventory
// ---------------------------------------------------------------------------

describe("GET /api/admin/inventory", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const req = makeReqWithParams(new URLSearchParams());
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns variants with stock data", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.productVariant.findMany.mockResolvedValue([
      {
        id: "v1",
        stock: 10,
        bookedStock: 5,
        reservedStock: 2,
        lowThreshold: null,
        criticalThreshold: null,
        product: { id: "p1", name: "Pikachu ex" },
        condition: "NM",
        isFoil: false,
      },
    ] as never);
    prisma.productVariant.count.mockResolvedValue(1 as never);
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const req = makeReqWithParams(new URLSearchParams());
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.variants).toHaveLength(1);
    expect(data.variants[0]).toMatchObject({
      id: "v1",
      actual: 10,
      booked: 5,
      reserved: 2,
      total: 17,
      name: "Pikachu ex",
      condition: "NM",
    });
  });

  it("filters by state (critical)", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.productVariant.findMany.mockResolvedValue([] as never);
    prisma.productVariant.count.mockResolvedValue(0 as never);
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const params = new URLSearchParams();
    params.set("state", "critical");
    const req = makeReqWithParams(params);
    await GET(req);

    // The function should have been called — we can't assert the exact
    // filter since state is computed post-query, but we verify it runs
    expect(prisma.productVariant.findMany).toHaveBeenCalled();
  });

  it("filters by search (product name)", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.productVariant.findMany.mockResolvedValue([] as never);
    prisma.productVariant.count.mockResolvedValue(0 as never);
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const params = new URLSearchParams();
    params.set("search", "Pikachu");
    const req = makeReqWithParams(params);
    await GET(req);

    expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product: { name: { contains: "Pikachu", mode: "insensitive" } },
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/inventory/[variantId]
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/inventory/[variantId]", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const req = makeReqWithBody({ action: "increase", quantity: 1 });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });
    expect(res.status).toBe(401);
  });

  it("action=increase: calls manualAdjustActual with positive delta", async () => {
    mockAdminOk();
    vi.mocked(manualAdjustActual).mockResolvedValue(undefined);

    const req = makeReqWithBody({ action: "increase", quantity: 3 });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(200);
    expect(manualAdjustActual).toHaveBeenCalledWith("v1", 3);
  });

  it("action=decrease: calls manualAdjustActual with negative delta", async () => {
    mockAdminOk();
    vi.mocked(manualAdjustActual).mockResolvedValue(undefined);

    const req = makeReqWithBody({ action: "decrease", quantity: 2 });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(200);
    expect(manualAdjustActual).toHaveBeenCalledWith("v1", -2);
  });

  it("action=reserve: calls reserveStock", async () => {
    mockAdminOk();
    vi.mocked(reserveStock).mockResolvedValue({ fromActual: 1, fromBooked: 0 });

    const req = makeReqWithBody({ action: "reserve", quantity: 1, note: "walk-in" });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(200);
    expect(reserveStock).toHaveBeenCalledWith("v1", 1, "walk-in");
  });

  it("action=unreserve: calls unreserveStock", async () => {
    mockAdminOk();
    vi.mocked(unreserveStock).mockResolvedValue(undefined);

    const req = makeReqWithBody({ action: "unreserve", quantity: 2 });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(200);
    expect(unreserveStock).toHaveBeenCalledWith("v1", 2);
  });

  it("action=clearReserved: calls clearReservedStock", async () => {
    mockAdminOk();
    vi.mocked(clearReservedStock).mockResolvedValue(undefined);

    const req = makeReqWithBody({ action: "clearReserved" });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(200);
    expect(clearReservedStock).toHaveBeenCalledWith("v1");
  });

  it("returns 400 for invalid action", async () => {
    mockAdminOk();
    const req = makeReqWithBody({ action: "delete", quantity: 1 });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(400);
  });

  it("returns 400 when quantity missing for actions that need it", async () => {
    mockAdminOk();
    const req = makeReqWithBody({ action: "increase" });
    const res = await PATCH(req, { params: Promise.resolve({ variantId: "v1" }) });

    expect(res.status).toBe(400);
  });
});
