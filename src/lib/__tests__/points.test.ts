import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

import { getPrisma } from "@/lib/prisma";
import {
  awardOrderPoints,
  awardTournamentPoints,
  getPointsBalance,
  adminSetPoints,
} from "@/lib/points";

// Helper to build a mock prisma client
function mockPrisma() {
  const m = {
    pointLedger: {
      findFirst: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
  };
  vi.mocked(getPrisma).mockReturnValue(m as never);
  return m;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("awardOrderPoints", () => {
  it("awards Math.floor(subtotal) points for positive subtotal", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.findFirst.mockResolvedValue(null);
    prisma.pointLedger.create.mockResolvedValue({} as never);

    await awardOrderPoints("alice@test.com", "order-1", 99.99);

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: {
        email: "alice@test.com",
        delta: 99,
        reason: "ORDER_EARN",
        referenceId: "order-1",
      },
    });
  });

  it("does nothing for $0 subtotal", async () => {
    const prisma = mockPrisma();
    await awardOrderPoints("alice@test.com", "order-1", 0);
    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it("does nothing for negative subtotal", async () => {
    const prisma = mockPrisma();
    await awardOrderPoints("alice@test.com", "order-1", -5);
    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it("skips if ORDER_EARN entry already exists for that orderId (idempotency)", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.findFirst.mockResolvedValue({ id: "existing" } as never);

    await awardOrderPoints("alice@test.com", "order-1", 100);

    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
    expect(prisma.pointLedger.findFirst).toHaveBeenCalledWith({
      where: { referenceId: "order-1", reason: "ORDER_EARN" },
    });
  });
});

describe("awardTournamentPoints", () => {
  it("awards Math.floor(entryFee) points for positive entryFee", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.findFirst.mockResolvedValue(null);
    prisma.pointLedger.create.mockResolvedValue({} as never);

    await awardTournamentPoints("bob@test.com", "reg-1", 50);

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: {
        email: "bob@test.com",
        delta: 50,
        reason: "TOURNAMENT_EARN",
        referenceId: "reg-1",
      },
    });
  });

  it("does nothing for $0 entryFee (free tournament)", async () => {
    const prisma = mockPrisma();
    await awardTournamentPoints("bob@test.com", "reg-1", 0);
    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it("skips if TOURNAMENT_EARN entry already exists for that registrationId", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.findFirst.mockResolvedValue({ id: "existing" } as never);

    await awardTournamentPoints("bob@test.com", "reg-1", 50);

    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
    expect(prisma.pointLedger.findFirst).toHaveBeenCalledWith({
      where: { referenceId: "reg-1", reason: "TOURNAMENT_EARN" },
    });
  });
});

describe("getPointsBalance", () => {
  it("returns SUM(delta) for that email", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.aggregate.mockResolvedValue({
      _sum: { delta: 150 },
    } as never);

    const balance = await getPointsBalance("alice@test.com");
    expect(balance).toBe(150);
  });

  it("returns 0 when no ledger entries exist", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.aggregate.mockResolvedValue({
      _sum: { delta: null },
    } as never);

    const balance = await getPointsBalance("nobody@test.com");
    expect(balance).toBe(0);
  });

  it("floors at 0 — negative raw sum returns 0", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.aggregate.mockResolvedValue({
      _sum: { delta: -20 },
    } as never);

    const balance = await getPointsBalance("debtor@test.com");
    expect(balance).toBe(0);
  });
});

describe("adminSetPoints", () => {
  it("sets balance to target by inserting delta = target - current", async () => {
    const prisma = mockPrisma();
    // current balance = 45
    prisma.pointLedger.aggregate.mockResolvedValue({
      _sum: { delta: 45 },
    } as never);
    prisma.pointLedger.create.mockResolvedValue({} as never);

    await adminSetPoints("alice@test.com", 60, "Compensation", "admin-1");

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: {
        email: "alice@test.com",
        delta: 15,
        reason: "ADMIN_ADJUST",
        referenceId: "admin-1",
        note: "Compensation",
      },
    });
  });

  it("clamps target to Math.max(0, target)", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.aggregate.mockResolvedValue({
      _sum: { delta: 50 },
    } as never);
    prisma.pointLedger.create.mockResolvedValue({} as never);

    await adminSetPoints("alice@test.com", -10, "Reset", "admin-1");

    // target clamped to 0, current = 50, delta = -50
    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: {
        email: "alice@test.com",
        delta: -50,
        reason: "ADMIN_ADJUST",
        referenceId: "admin-1",
        note: "Reset",
      },
    });
  });

  it("does nothing if delta is 0 (already at target)", async () => {
    const prisma = mockPrisma();
    prisma.pointLedger.aggregate.mockResolvedValue({
      _sum: { delta: 50 },
    } as never);

    await adminSetPoints("alice@test.com", 50, "No change", "admin-1");

    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it("rejects empty note", async () => {
    mockPrisma();
    await expect(
      adminSetPoints("alice@test.com", 100, "", "admin-1"),
    ).rejects.toThrow("Reason required");
  });

  it("rejects whitespace-only note", async () => {
    mockPrisma();
    await expect(
      adminSetPoints("alice@test.com", 100, "   ", "admin-1"),
    ).rejects.toThrow("Reason required");
  });
});
