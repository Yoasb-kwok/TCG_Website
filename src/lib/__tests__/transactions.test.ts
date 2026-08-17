import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the service
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

import { getPrisma } from "@/lib/prisma";
import {
  createOrderTransaction,
  createTournamentTransaction,
  buildOrderReceiptData,
  buildTournamentReceiptData,
} from "../transactions";

// ── Test fixtures ──────────────────────────────────────────────────────

const mockOrderWithItems = {
  id: "order-1",
  userId: "user-1",
  email: "alice@test.com",
  status: "PAID",
  totalAmount: 150,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  items: [
    {
      unitPrice: 50,
      quantity: 2,
      variant: {
        condition: "NM",
        product: { name: "Pikachu" },
      },
    },
    {
      unitPrice: 50,
      quantity: 1,
      variant: {
        condition: "LP",
        product: { name: "Charizard" },
      },
    },
  ],
};

const mockOrderGuest = {
  ...mockOrderWithItems,
  id: "order-guest",
  userId: null,
  email: "guest@test.com",
};

const mockUser = {
  id: "user-1",
  email: "alice@test.com",
  name: "Alice Wong",
};

const mockRegistration = {
  id: "reg-1",
  userId: "user-1",
  email: "alice@test.com",
  playerName: "Alice Wong",
  paymentStatus: "PAID",
  createdAt: new Date("2026-02-01T08:00:00Z"),
  tournament: {
    id: "tourn-1",
    title: "Sunday Cup",
    entryFee: 100,
    startsAt: new Date("2026-03-01T14:00:00Z"),
    location: "Mong Kok Store",
  },
};

const mockRegistrationGuest = {
  ...mockRegistration,
  id: "reg-guest",
  userId: null,
  email: "guest@test.com",
  playerName: "Guest Player",
};

// ── Helper to build prisma mock ────────────────────────────────────────

function makeMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    transaction: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "txn-1" }),
    },
    order: {
      findUnique: vi.fn().mockResolvedValue(mockOrderWithItems),
    },
    tournamentRegistration: {
      findUnique: vi.fn().mockResolvedValue(mockRegistration),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(mockUser),
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("buildOrderReceiptData", () => {
  it("builds receipt snapshot from order with items", () => {
    const receipt = buildOrderReceiptData(mockOrderWithItems as never);

    expect(receipt.type).toBe("ORDER");
    expect(receipt.orderId).toBe("order-1");
    expect(receipt.email).toBe("alice@test.com");
    expect(receipt.totalAmount).toBe(150);
    expect(receipt.items).toHaveLength(2);
    expect(receipt.items[0]).toEqual({
      name: "Pikachu",
      condition: "NM",
      quantity: 2,
      unitPrice: 50,
    });
    expect(receipt.items[1]).toEqual({
      name: "Charizard",
      condition: "LP",
      quantity: 1,
      unitPrice: 50,
    });
  });

  it("formats date as ISO string", () => {
    const receipt = buildOrderReceiptData(mockOrderWithItems as never);
    expect(receipt.date).toBe("2026-01-15T10:00:00.000Z");
  });
});

describe("buildTournamentReceiptData", () => {
  it("builds receipt snapshot from tournament registration", () => {
    const receipt = buildTournamentReceiptData(mockRegistration as never);

    expect(receipt.type).toBe("TOURNAMENT");
    expect(receipt.tournamentTitle).toBe("Sunday Cup");
    expect(receipt.playerName).toBe("Alice Wong");
    expect(receipt.entryFee).toBe(100);
    expect(receipt.location).toBe("Mong Kok Store");
    expect(receipt.startsAt).toBe("2026-03-01T14:00:00.000Z");
  });
});

describe("createOrderTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Transaction row from a PAID order", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
      include: expect.objectContaining({
        items: expect.any(Object),
      }),
    });
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "ORDER",
          referenceId: "order-1",
          amount: 150,
          status: "PAID",
        }),
      }),
    );
  });

  it("sets buyerType to USER when order.userId is present", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerType: "USER",
        }),
      }),
    );
  });

  it("sets buyerType to GUEST when order.userId is null", async () => {
    const mockPrisma = makeMockPrisma({
      order: {
        findUnique: vi.fn().mockResolvedValue(mockOrderGuest),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-guest");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerType: "GUEST",
          email: "guest@test.com",
        }),
      }),
    );
  });

  it("sets customerName to User.name for registered users", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: "Alice Wong",
        }),
      }),
    );
  });

  it("sets customerName to null for guests", async () => {
    const mockPrisma = makeMockPrisma({
      order: {
        findUnique: vi.fn().mockResolvedValue(mockOrderGuest),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-guest");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: null,
        }),
      }),
    );
  });

  it("builds description from product names", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Pikachu, Charizard",
        }),
      }),
    );
  });

  it("does NOT create duplicate if Transaction already exists for this order", async () => {
    const mockPrisma = makeMockPrisma({
      transaction: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing-txn" }), // Already exists
        create: vi.fn(),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it("does nothing if order is not found", async () => {
    const mockPrisma = makeMockPrisma({
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("nonexistent");

    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it("includes receiptData JSON snapshot", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    const createCall = mockPrisma.transaction.create.mock.calls[0][0];
    expect(createCall.data.receiptData).toBeDefined();
    expect(createCall.data.receiptData.type).toBe("ORDER");
    expect(createCall.data.receiptData.items).toHaveLength(2);
  });
});

describe("createTournamentTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Transaction row from a PAID tournament registration", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "TOURNAMENT",
          referenceId: "reg-1",
          amount: 100,
          status: "PAID",
        }),
      }),
    );
  });

  it("sets customerName to playerName (always present for tournaments)", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: "Alice Wong",
        }),
      }),
    );
  });

  it("sets description to tournament title", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Sunday Cup",
        }),
      }),
    );
  });

  it("does NOT create duplicate if Transaction already exists", async () => {
    const mockPrisma = makeMockPrisma({
      transaction: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing-txn" }),
        create: vi.fn(),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it("includes receiptData JSON snapshot with tournament details", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    const createCall = mockPrisma.transaction.create.mock.calls[0][0];
    expect(createCall.data.receiptData).toBeDefined();
    expect(createCall.data.receiptData.type).toBe("TOURNAMENT");
    expect(createCall.data.receiptData.tournamentTitle).toBe("Sunday Cup");
  });

  it("sets buyerType to GUEST for guest registration", async () => {
    const mockPrisma = makeMockPrisma({
      tournamentRegistration: {
        findUnique: vi.fn().mockResolvedValue(mockRegistrationGuest),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-guest");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerType: "GUEST",
          customerName: "Guest Player",
        }),
      }),
    );
  });
});

// ── ADR-009: paidAt maintenance ─────────────────────────────────────────

describe("paidAt on creation (ADR-009)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets paidAt when order transaction is created with a money-received status", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          paidAt: expect.any(Date),
        }),
      }),
    );
  });

  it("omits paidAt when order is PENDING", async () => {
    const mockPrisma = makeMockPrisma({
      order: {
        findUnique: vi.fn().mockResolvedValue({
          ...mockOrderWithItems,
          status: "PENDING",
        }),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createOrderTransaction("order-1");

    const createCall = mockPrisma.transaction.create.mock.calls[0][0];
    expect(createCall.data.status).toBe("PENDING");
    expect(createCall.data.paidAt).toBeUndefined();
  });

  it("sets paidAt when tournament transaction is created as PAID", async () => {
    const mockPrisma = makeMockPrisma();
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          paidAt: expect.any(Date),
        }),
      }),
    );
  });

  it("omits paidAt when tournament registration is PENDING", async () => {
    const mockPrisma = makeMockPrisma({
      tournamentRegistration: {
        findUnique: vi.fn().mockResolvedValue({
          ...mockRegistration,
          paymentStatus: "PENDING",
        }),
      },
    });
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as never);

    await createTournamentTransaction("reg-1");

    const createCall = mockPrisma.transaction.create.mock.calls[0][0];
    expect(createCall.data.status).toBe("PENDING");
    expect(createCall.data.paidAt).toBeUndefined();
  });
});
