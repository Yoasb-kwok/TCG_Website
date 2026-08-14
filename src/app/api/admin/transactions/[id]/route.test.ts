import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

import { requireAdmin } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/transactions/txn-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAdminOk() {
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: true as const,
    session: { user: { id: "admin-1", role: "ADMIN" } } as never,
  } as never);
}

function mockAdminFail() {
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: false as const,
    response: { status: 401 } as never,
  } as never);
}

describe("PATCH /api/admin/transactions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminOk();
  });

  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const res = await PATCH(makeRequest({ status: "PAID" }), {
      params: Promise.resolve({ id: "txn-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("updates status", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: "txn-1",
      status: "PAID",
      remark: null,
    });
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { update: mockUpdate },
    } as never);

    const res = await PATCH(makeRequest({ status: "PAID" }), {
      params: Promise.resolve({ id: "txn-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "txn-1" },
        data: { status: "PAID" },
      }),
    );
    expect(data.transaction.status).toBe("PAID");
  });

  it("updates remark", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: "txn-1",
      status: "PAID",
      remark: "Customer note",
    });
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { update: mockUpdate },
    } as never);

    const res = await PATCH(makeRequest({ remark: "Customer note" }), {
      params: Promise.resolve({ id: "txn-1" }),
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { remark: "Customer note" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("updates both status and remark", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: "txn-1",
      status: "SHIPPED",
      remark: "Shipped via SF Express",
    });
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { update: mockUpdate },
    } as never);

    await PATCH(
      makeRequest({ status: "SHIPPED", remark: "Shipped via SF Express" }),
      { params: Promise.resolve({ id: "txn-1" }) },
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "SHIPPED", remark: "Shipped via SF Express" },
      }),
    );
  });

  it("allows any status transition (unconstrained)", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: "txn-1", status: "CANCELLED" });
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { update: mockUpdate },
    } as never);

    // Try transitioning from PAID to CANCELLED (normally a refund scenario)
    const res = await PATCH(makeRequest({ status: "CANCELLED" }), {
      params: Promise.resolve({ id: "txn-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
