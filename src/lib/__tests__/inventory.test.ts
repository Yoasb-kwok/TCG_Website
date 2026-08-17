import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

import { getPrisma } from "@/lib/prisma";
import {
  getVariantState,
  getSellableQuantity,
  getEffectiveThresholds,
  reserveStock,
  unreserveStock,
  clearReservedStock,
  manualAdjustActual,
  createStockRecord,
  arriveStockRecord,
} from "@/lib/inventory";

// Helper to build a mock prisma client
function mockPrisma() {
  const m = {
    productVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stockRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    shopSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  vi.mocked(getPrisma).mockReturnValue(m as never);
  return m;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

describe("getVariantState", () => {
  it("returns healthy when actual > low", () => {
    expect(getVariantState(12, 5, 2)).toBe("healthy");
  });

  it("returns low when critical <= actual <= low", () => {
    expect(getVariantState(5, 5, 2)).toBe("low");
    expect(getVariantState(3, 5, 2)).toBe("low");
    expect(getVariantState(2, 5, 2)).toBe("low");
  });

  it("returns critical when actual < critical", () => {
    expect(getVariantState(1, 5, 2)).toBe("critical");
    expect(getVariantState(0, 5, 2)).toBe("critical");
  });
});

describe("getSellableQuantity", () => {
  it("returns actual - critical when positive", () => {
    expect(getSellableQuantity(12, 5)).toBe(7);
    expect(getSellableQuantity(6, 5)).toBe(1);
  });

  it("returns 0 when actual <= critical", () => {
    expect(getSellableQuantity(5, 5)).toBe(0);
    expect(getSellableQuantity(2, 5)).toBe(0);
    expect(getSellableQuantity(0, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveThresholds
// ---------------------------------------------------------------------------

describe("getEffectiveThresholds", () => {
  it("returns per-variant override when both set", async () => {
    const result = await getEffectiveThresholds({
      lowThreshold: 10,
      criticalThreshold: 3,
    });
    expect(result).toEqual({ low: 10, critical: 3 });
  });

  it("falls back to global defaults when both null", async () => {
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const result = await getEffectiveThresholds({
      lowThreshold: null,
      criticalThreshold: null,
    });
    expect(result).toEqual({ low: 5, critical: 2 });
  });

  it("mixes per-variant override with global fallback", async () => {
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue({
      defaultLowThreshold: 5,
      defaultCriticalThreshold: 2,
    } as never);

    const result = await getEffectiveThresholds({
      lowThreshold: 8,
      criticalThreshold: null,
    });
    expect(result).toEqual({ low: 8, critical: 2 });
  });

  it("uses hardcoded fallback when ShopSetting row missing", async () => {
    const prisma = mockPrisma();
    prisma.shopSetting.findUnique.mockResolvedValue(null);

    const result = await getEffectiveThresholds({
      lowThreshold: null,
      criticalThreshold: null,
    });
    expect(result).toEqual({ low: 5, critical: 2 });
  });
});

// ---------------------------------------------------------------------------
// reserveStock
// ---------------------------------------------------------------------------

describe("reserveStock", () => {
  it("reserves from actual first (actual decreases, reserved increases)", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 10,
      bookedStock: 5,
      reservedStock: 2,
    } as never);

    await reserveStock("v1", 3, "walk-in Mr. Chan");

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        stock: 7, // 10 - 3
        bookedStock: 5, // unchanged
        reservedStock: 5, // 2 + 3
        reservedNote: "walk-in Mr. Chan",
      },
    });
  });

  it("reserves from booked when actual is 0", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 0,
      bookedStock: 5,
      reservedStock: 0,
    } as never);

    await reserveStock("v1", 2);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        stock: 0,
        bookedStock: 3, // 5 - 2
        reservedStock: 2, // 0 + 2
      },
    });
  });

  it("reserves from both when actual is insufficient", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 2,
      bookedStock: 5,
      reservedStock: 0,
    } as never);

    await reserveStock("v1", 4);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        stock: 0, // 2 - 2 (all actual used)
        bookedStock: 3, // 5 - 2 (remaining 2 from booked)
        reservedStock: 4, // 0 + 4
      },
    });
  });

  it("throws when both actual and booked are insufficient", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 1,
      bookedStock: 2,
      reservedStock: 0,
    } as never);

    await expect(reserveStock("v1", 5)).rejects.toThrow();
  });

  it("throws when variant not found", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue(null);

    await expect(reserveStock("v1", 1)).rejects.toThrow();
  });

  it("preserves existing reservedNote when no new note provided", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 10,
      bookedStock: 0,
      reservedStock: 2,
      reservedNote: "existing note",
    } as never);

    await reserveStock("v1", 1);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({
        reservedNote: "existing note",
      }),
    });
  });
});

// ---------------------------------------------------------------------------
// unreserveStock
// ---------------------------------------------------------------------------

describe("unreserveStock", () => {
  it("returns quantity to actual (reserved decreases, actual increases)", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 5,
      bookedStock: 0,
      reservedStock: 3,
    } as never);

    await unreserveStock("v1", 2);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        stock: 7, // 5 + 2
        reservedStock: 1, // 3 - 2
      },
    });
  });

  it("throws when trying to unreserve more than reserved", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 5,
      bookedStock: 0,
      reservedStock: 1,
    } as never);

    await expect(unreserveStock("v1", 3)).rejects.toThrow();
  });

  it("throws when variant not found", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue(null);

    await expect(unreserveStock("v1", 1)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// clearReservedStock
// ---------------------------------------------------------------------------

describe("clearReservedStock", () => {
  it("sets reserved to 0, returns all to actual", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 5,
      bookedStock: 0,
      reservedStock: 3,
      reservedNote: "walk-in",
    } as never);

    await clearReservedStock("v1");

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        stock: 8, // 5 + 3
        reservedStock: 0,
        reservedNote: null,
      },
    });
  });

  it("does nothing if reserved is already 0", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 5,
      bookedStock: 0,
      reservedStock: 0,
      reservedNote: null,
    } as never);

    await clearReservedStock("v1");

    expect(prisma.productVariant.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// manualAdjustActual
// ---------------------------------------------------------------------------

describe("manualAdjustActual", () => {
  it("increases actual by delta", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 5,
    } as never);

    await manualAdjustActual("v1", 3);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: 8 },
    });
  });

  it("decreases actual by delta", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 5,
    } as never);

    await manualAdjustActual("v1", -2);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: 3 },
    });
  });

  it("floors at 0 (does not go negative)", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue({
      id: "v1",
      stock: 2,
    } as never);

    await manualAdjustActual("v1", -5);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: 0 },
    });
  });

  it("throws when variant not found", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue(null);

    await expect(manualAdjustActual("v1", 1)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createStockRecord
// ---------------------------------------------------------------------------

describe("createStockRecord", () => {
  const mockVariant = {
    condition: "Near Mint (NM)",
    isFoil: false,
    product: { name: "Pikachu ex" },
  };

  it("creates StockRecord with state BOOKED and denormalized data", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue(mockVariant as never);
    prisma.stockRecord.create.mockResolvedValue({ id: "rec-1" } as never);
    prisma.productVariant.update.mockResolvedValue({} as never);

    const result = await createStockRecord("v1", 10, 15.5);

    expect(result).toBe("rec-1");
    expect(prisma.stockRecord.create).toHaveBeenCalledWith({
      data: {
        variantId: "v1",
        quantity: 10,
        unitCost: 15.5,
        state: "BOOKED",
        productName: "Pikachu ex",
        variantCondition: "Near Mint (NM)",
        variantIsFoil: false,
      },
    });
  });

  it("increments variant bookedStock by quantity", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue(mockVariant as never);
    prisma.stockRecord.create.mockResolvedValue({ id: "rec-1" } as never);
    prisma.productVariant.update.mockResolvedValue({} as never);

    await createStockRecord("v1", 10, 15.5);

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { bookedStock: { increment: 10 } },
    });
  });

  it("throws if variant not found", async () => {
    const prisma = mockPrisma();
    prisma.productVariant.findUnique.mockResolvedValue(null as never);

    await expect(createStockRecord("v1", 10, 15.5)).rejects.toThrow(
      "Variant not found",
    );
  });
});

// ---------------------------------------------------------------------------
// arriveStockRecord
// ---------------------------------------------------------------------------

describe("arriveStockRecord", () => {
  it("sets state to ARRIVED, fills arrivedAt, transfers booked→actual", async () => {
    const prisma = mockPrisma();
    const arrivalDate = new Date("2026-08-14T10:00:00Z");
    prisma.stockRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      variantId: "v1",
      quantity: 10,
      state: "BOOKED",
    } as never);
    prisma.stockRecord.update.mockResolvedValue({} as never);
    prisma.productVariant.update.mockResolvedValue({} as never);

    await arriveStockRecord("rec-1", arrivalDate, "arrived in good condition");

    // Update record
    expect(prisma.stockRecord.update).toHaveBeenCalledWith({
      where: { id: "rec-1" },
      data: {
        state: "ARRIVED",
        arrivedAt: arrivalDate,
        arrivalNote: "arrived in good condition",
      },
    });

    // Transfer: bookedStock -= 10, stock += 10
    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        bookedStock: { decrement: 10 },
        stock: { increment: 10 },
      },
    });
  });

  it("stores arrivalNote as null when not provided", async () => {
    const prisma = mockPrisma();
    const arrivalDate = new Date("2026-08-14T10:00:00Z");
    prisma.stockRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      variantId: "v1",
      quantity: 5,
      state: "BOOKED",
    } as never);
    prisma.stockRecord.update.mockResolvedValue({} as never);
    prisma.productVariant.update.mockResolvedValue({} as never);

    await arriveStockRecord("rec-1", arrivalDate);

    expect(prisma.stockRecord.update).toHaveBeenCalledWith({
      where: { id: "rec-1" },
      data: expect.objectContaining({
        arrivalNote: null,
      }),
    });
  });

  it("throws if record already ARRIVED (one-way toggle)", async () => {
    const prisma = mockPrisma();
    prisma.stockRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      variantId: "v1",
      quantity: 10,
      state: "ARRIVED",
    } as never);

    await expect(
      arriveStockRecord("rec-1", new Date()),
    ).rejects.toThrow();
  });

  it("throws if record not found", async () => {
    const prisma = mockPrisma();
    prisma.stockRecord.findUnique.mockResolvedValue(null);

    await expect(
      arriveStockRecord("rec-1", new Date()),
    ).rejects.toThrow();
  });

  it("updates record without touching variant when variantId is null (deleted product)", async () => {
    const prisma = mockPrisma();
    const arrivalDate = new Date("2026-08-14T10:00:00Z");
    prisma.stockRecord.findUnique.mockResolvedValue({
      id: "rec-orphan",
      variantId: null,
      quantity: 10,
      state: "BOOKED",
    } as never);
    prisma.stockRecord.update.mockResolvedValue({} as never);

    await arriveStockRecord("rec-orphan", arrivalDate, "late arrival");

    expect(prisma.stockRecord.update).toHaveBeenCalled();
    expect(prisma.productVariant.update).not.toHaveBeenCalled();
  });
});
