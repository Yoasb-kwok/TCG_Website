import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/auth-server", () => ({ requireAdmin: vi.fn() }));

import { GET, PATCH } from "./route";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";

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
    shopSetting: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
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

describe("GET /api/admin/shop-settings", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns current thresholds", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 8,
      defaultCriticalThreshold: 3,
    } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.defaultLowThreshold).toBe(8);
    expect(data.defaultCriticalThreshold).toBe(3);
  });

  it("creates singleton with defaults on first call", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue(null);
    prisma.shopSetting.create.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.defaultLowThreshold).toBe(5);
    expect(data.defaultCriticalThreshold).toBe(2);
    expect(prisma.shopSetting.create).toHaveBeenCalledWith({ data: { id: "default" } });
  });
});

describe("PATCH /api/admin/shop-settings", () => {
  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const req = makeReqWithBody({ defaultLowThreshold: 10 });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("updates defaultLowThreshold", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);
    prisma.shopSetting.upsert.mockResolvedValue({
      defaultLowThreshold: 10,
      defaultCriticalThreshold: 2,
    } as never);

    const req = makeReqWithBody({ defaultLowThreshold: 10 });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.defaultLowThreshold).toBe(10);
  });

  it("updates defaultCriticalThreshold", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);
    prisma.shopSetting.upsert.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 4,
    } as never);

    const req = makeReqWithBody({ defaultCriticalThreshold: 4 });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
  });

  it("returns 400 if low <= critical", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const req = makeReqWithBody({ defaultLowThreshold: 2, defaultCriticalThreshold: 5 });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative critical", async () => {
    mockAdminOk();
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const req = makeReqWithBody({ defaultCriticalThreshold: -1 });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
