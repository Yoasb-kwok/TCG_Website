import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/points", () => ({
  getPointsBalance: vi.fn(),
  adminSetPoints: vi.fn(),
}));

import { GET, PATCH } from "./route";
import { requireAdmin } from "@/lib/auth-server";
import { getPointsBalance, adminSetPoints } from "@/lib/points";
import { getPrisma } from "@/lib/prisma";

beforeEach(() => vi.clearAllMocks());

function makeReq(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    nextUrl: { searchParams: new URLSearchParams() },
  } as unknown as NextRequest;
}

function makeReqWithSearch(search: string, type: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type) params.set("type", type);
  return {
    nextUrl: { searchParams: params },
  } as unknown as NextRequest;
}

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

function mockPrismaQueryRaw(rows: unknown[]) {
  vi.mocked(getPrisma).mockReturnValue({
    $queryRaw: vi.fn().mockResolvedValue(rows),
  } as never);
}

describe("GET /api/admin/points", () => {
  it("returns aggregated list with correct fields", async () => {
    mockAdminOk();
    mockPrismaQueryRaw([
      { email: "alice@test.com", name: "Alice", type: "USER", balance: 150, lastearned: "2026-01-01" },
      { email: "guest@test.com", name: null, type: "GUEST", balance: 50, lastearned: "2026-02-01" },
    ]);

    const res = await GET(makeReqWithSearch("", ""));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accounts).toHaveLength(2);
    expect(data.accounts[0]).toMatchObject({
      email: "alice@test.com",
      name: "Alice",
      type: "USER",
      balance: 150,
    });
  });

  it("returns 401 for non-admin", async () => {
    mockAdminFail();
    const res = await GET(makeReqWithSearch("", ""));
    expect(res.status).toBe(401);
  });

  it("supports type filter (USER)", async () => {
    mockAdminOk();
    mockPrismaQueryRaw([
      { email: "alice@test.com", name: "Alice", type: "USER", balance: 150, lastearned: null },
    ]);

    const res = await GET(makeReqWithSearch("", "USER"));
    const data = await res.json();

    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0].type).toBe("USER");
  });

  it("supports type filter (GUEST)", async () => {
    mockAdminOk();
    mockPrismaQueryRaw([
      { email: "guest@test.com", name: null, type: "GUEST", balance: 30, lastearned: null },
    ]);

    const res = await GET(makeReqWithSearch("", "GUEST"));
    const data = await res.json();

    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0].type).toBe("GUEST");
  });

  it("returns empty list when no ledger entries", async () => {
    mockAdminOk();
    mockPrismaQueryRaw([]);

    const res = await GET(makeReqWithSearch("", ""));
    const data = await res.json();

    expect(data.accounts).toHaveLength(0);
  });
});

describe("PATCH /api/admin/points", () => {
  it("adjusts points and returns updated balance", async () => {
    mockAdminOk();
    vi.mocked(adminSetPoints).mockResolvedValue(undefined);
    vi.mocked(getPointsBalance).mockResolvedValue(60);

    const res = await PATCH(
      makeReq({ email: "alice@test.com", target: 60, note: "Compensation" }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ email: "alice@test.com", points: 60 });
    expect(adminSetPoints).toHaveBeenCalledWith(
      "alice@test.com",
      60,
      "Compensation",
      "admin-1",
    );
  });

  it("returns 401 for non-admin", async () => {
    mockAdminFail();
    const res = await PATCH(
      makeReq({ email: "alice@test.com", target: 60, note: "test" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on adminSetPoints error (e.g. empty reason)", async () => {
    mockAdminOk();
    vi.mocked(adminSetPoints).mockRejectedValue(new Error("Reason required"));

    const res = await PATCH(
      makeReq({ email: "alice@test.com", target: 100, note: "" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Reason required");
  });
});
