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
import { GET, POST } from "./route";

function makeRequest(query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/transactions");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function mockAdminOk() {
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: true as const,
    session: { user: { id: "admin-1", role: "ADMIN", email: "admin@test.com", name: "Admin" } },
  } as never);
}

function mockAdminFail() {
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: false as const,
    response: { status: 401 } as never,
  });
}

const mockTransactions = [
  {
    id: "txn-1",
    type: "ORDER",
    referenceId: "order-1",
    buyerType: "USER",
    email: "alice@test.com",
    customerName: "Alice",
    description: "Pikachu",
    amount: 100,
    status: "PAID",
    remark: null,
    receiptData: null,
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "txn-2",
    type: "TOURNAMENT",
    referenceId: "reg-1",
    buyerType: "GUEST",
    email: "guest@test.com",
    customerName: "Guest Player",
    description: "Sunday Cup",
    amount: 50,
    status: "PENDING",
    remark: null,
    receiptData: null,
    createdAt: new Date("2026-02-01"),
  },
];

function makeMockPrisma() {
  return {
    transaction: {
      findMany: vi.fn().mockResolvedValue(mockTransactions),
      count: vi.fn().mockResolvedValue(2),
    },
  };
}

describe("GET /api/admin/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminOk();
    vi.mocked(getPrisma).mockReturnValue(makeMockPrisma() as never);
  });

  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns paginated transactions", async () => {
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.transactions).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
    expect(data.totalPages).toBe(1);
  });

  it("filters by status", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest({ status: "PAID" }));

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("PAID");
  });

  it("filters by type (ORDER vs TOURNAMENT)", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest({ type: "ORDER" }));

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.where.type).toBe("ORDER");
  });

  it("filters by buyerType (USER vs GUEST)", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest({ buyerType: "GUEST" }));

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.where.buyerType).toBe("GUEST");
  });

  it("searches by email", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest({ search: "alice" }));

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toHaveLength(3); // email, customerName, description
    expect(callArgs.where.OR[0].email).toBeDefined();
    expect(callArgs.where.OR[0].email.mode).toBe("insensitive");
  });

  it("sorts by date descending (default)", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest());

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.orderBy.createdAt).toBe("desc");
  });

  it("sorts by amount descending", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest({ sort: "amount", order: "desc" }));

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.orderBy.amount).toBe("desc");
  });

  it("returns empty array when no matches", async () => {
    const mockPrisma = {
      transaction: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    const res = await GET(makeRequest({ search: "nonexistent" }));
    const data = await res.json();
    expect(data.transactions).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("supports pagination", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await GET(makeRequest({ page: "2" }));

    const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(30); // page 2 × 30 per page
    expect(callArgs.take).toBe(30);
  });
});

// ── POST tests (manual offline transaction) ───────────────────────────

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminOk();
  });

  it("returns 401 without admin auth", async () => {
    mockAdminFail();
    const res = await POST(
      makePostRequest({
        type: "ORDER",
        referenceId: "manual-1",
        email: "test@test.com",
        description: "Walk-in purchase",
        amount: 100,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a manual transaction with NOT_REQUIRED status", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "txn-new" });
    const mockFindUnique = vi.fn().mockResolvedValue(null); // No user = guest
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { create: mockCreate },
      user: { findUnique: mockFindUnique },
    } as never);

    const res = await POST(
      makePostRequest({
        type: "ORDER",
        referenceId: "manual-1",
        email: "guest@test.com",
        description: "Walk-in purchase",
        amount: 100,
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "NOT_REQUIRED",
          amount: 100,
          description: "Walk-in purchase",
        }),
      }),
    );
  });

  it("sets buyerType to USER when email matches a registered user", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "txn-new" });
    const mockFindUnique = vi.fn().mockResolvedValue({ id: "user-1", name: "Alice" });
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { create: mockCreate },
      user: { findUnique: mockFindUnique },
    } as never);

    await POST(
      makePostRequest({
        type: "ORDER",
        referenceId: "manual-1",
        email: "alice@test.com",
        description: "Offline order",
        amount: 50,
      }),
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerType: "USER",
          customerName: "Alice",
        }),
      }),
    );
  });

  it("sets buyerType to GUEST for unknown email", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "txn-new" });
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    vi.mocked(getPrisma).mockReturnValue({
      transaction: { create: mockCreate },
      user: { findUnique: mockFindUnique },
    } as never);

    await POST(
      makePostRequest({
        type: "ORDER",
        referenceId: "manual-1",
        email: "unknown@test.com",
        description: "Cash sale",
        amount: 30,
      }),
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerType: "GUEST",
          customerName: null,
        }),
      }),
    );
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostRequest({ type: "ORDER" }));
    expect(res.status).toBe(400);
  });
});
