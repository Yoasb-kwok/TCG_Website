import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/points", () => ({
  awardOrderPoints: vi.fn(),
}));

vi.mock("@/lib/transactions", () => ({
  createOrderTransaction: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import { createOrderTransaction } from "@/lib/transactions";
import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/orders/order-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockOrder = {
  id: "order-1",
  email: "alice@test.com",
  status: "PAID",
  items: [
    {
      unitPrice: 50,
      quantity: 2,
      variant: { condition: "NM", product: { name: "Pikachu" } },
    },
  ],
};

describe("PATCH /api/admin/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true as const,
      session: { user: { id: "admin-1", role: "ADMIN" } } as never,
    } as never);
  });

  it("returns 401 without admin auth", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false as const,
      response: { status: 401 } as never,
    } as never);

    const res = await PATCH(makeRequest({ status: "PAID" }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("updates the order status", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(mockOrder);
    vi.mocked(getPrisma).mockReturnValue({
      order: { update: mockUpdate },
    } as never);

    const res = await PATCH(makeRequest({ status: "PAID" }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1" },
        data: { status: "PAID" },
      }),
    );
    expect(data.order.id).toBe("order-1");
  });

  it("creates a ledger Transaction with paidAt on manual PAID (ADR-009)", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(mockOrder);
    vi.mocked(getPrisma).mockReturnValue({
      order: { update: mockUpdate },
    } as never);
    vi.mocked(createOrderTransaction).mockResolvedValue(undefined);

    await PATCH(makeRequest({ status: "PAID" }), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(createOrderTransaction).toHaveBeenCalledWith("order-1");
  });

  it("creates a ledger Transaction for direct SHIPPED transitions (walk-in)", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      ...mockOrder,
      status: "SHIPPED",
    });
    vi.mocked(getPrisma).mockReturnValue({
      order: { update: mockUpdate },
    } as never);

    await PATCH(makeRequest({ status: "SHIPPED" }), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(createOrderTransaction).toHaveBeenCalledWith("order-1");
  });

  it("does not create a ledger Transaction for non-money statuses", async () => {
    for (const status of ["PENDING", "CANCELLED"]) {
      const mockUpdate = vi.fn().mockResolvedValue({
        ...mockOrder,
        status,
      });
      vi.mocked(getPrisma).mockReturnValue({
        order: { update: mockUpdate },
      } as never);

      await PATCH(makeRequest({ status }), {
        params: Promise.resolve({ id: "order-1" }),
      });
    }

    expect(createOrderTransaction).not.toHaveBeenCalled();
  });
});
