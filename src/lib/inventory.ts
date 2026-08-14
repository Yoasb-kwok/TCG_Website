import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

// Hardcoded fallback when ShopSetting row is missing
const FALLBACK_LOW_THRESHOLD = 5;
const FALLBACK_CRITICAL_THRESHOLD = 2;

// ---------------------------------------------------------------------------
// Pure functions (no DB access)
// ---------------------------------------------------------------------------

/**
 * Calculate stock state from actual quantity and thresholds.
 * actual > low → healthy; critical <= actual <= low → low; actual < critical → critical
 */
export function getVariantState(
  actual: number,
  low: number,
  critical: number,
): "healthy" | "low" | "critical" {
  if (actual > low) return "healthy";
  if (actual >= critical) return "low";
  return "critical";
}

/**
 * Calculate sellable quantity (buffer zone for walk-in customers).
 * Returns max(0, actual - critical).
 */
export function getSellableQuantity(actual: number, critical: number): number {
  return Math.max(0, actual - critical);
}

// ---------------------------------------------------------------------------
// Threshold resolution (may need DB for global defaults)
// ---------------------------------------------------------------------------

/**
 * Resolve effective thresholds: per-variant override or global default.
 * Does NOT touch the DB if both overrides are set.
 */
export async function getEffectiveThresholds(variant: {
  lowThreshold: number | null;
  criticalThreshold: number | null;
}): Promise<{ low: number; critical: number }> {
  if (variant.lowThreshold !== null && variant.criticalThreshold !== null) {
    return { low: variant.lowThreshold, critical: variant.criticalThreshold };
  }

  // Need global defaults
  let globalLow = FALLBACK_LOW_THRESHOLD;
  let globalCritical = FALLBACK_CRITICAL_THRESHOLD;

  if (isDatabaseConfigured()) {
    try {
      const prisma = getPrisma();
      const setting = await prisma.shopSetting.findUnique({
        where: { id: "default" },
      });
      if (setting) {
        globalLow = setting.defaultLowThreshold;
        globalCritical = setting.defaultCriticalThreshold;
      }
    } catch {
      // Use hardcoded fallback on error
    }
  }

  return {
    low: variant.lowThreshold ?? globalLow,
    critical: variant.criticalThreshold ?? globalCritical,
  };
}

// ---------------------------------------------------------------------------
// Stock operations (DB mutations)
// ---------------------------------------------------------------------------

/**
 * Reserve stock: takes from actual first, then booked. Updates reservedNote.
 * Throws if insufficient stock or variant not found.
 */
export async function reserveStock(
  variantId: string,
  quantity: number,
  note?: string,
): Promise<{ fromActual: number; fromBooked: number }> {
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) throw new Error("Variant not found");

  const fromActual = Math.min(quantity, variant.stock);
  const fromBooked = Math.min(quantity - fromActual, variant.bookedStock);

  if (fromActual + fromBooked < quantity) {
    throw new Error(
      `Insufficient stock to reserve ${quantity}. Available: ${variant.stock + variant.bookedStock}`,
    );
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      stock: variant.stock - fromActual,
      bookedStock: variant.bookedStock - fromBooked,
      reservedStock: variant.reservedStock + quantity,
      reservedNote: note !== undefined ? note : variant.reservedNote,
    },
  });

  return { fromActual, fromBooked };
}

/**
 * Un-reserve stock: returns quantity from reserved back to actual.
 * Throws if trying to unreserve more than reserved or variant not found.
 */
export async function unreserveStock(
  variantId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) throw new Error("Variant not found");
  if (quantity > variant.reservedStock) {
    throw new Error(
      `Cannot unreserve ${quantity}. Currently reserved: ${variant.reservedStock}`,
    );
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      stock: variant.stock + quantity,
      reservedStock: variant.reservedStock - quantity,
    },
  });
}

/**
 * Clear all reserved stock: returns everything to actual, clears note.
 */
export async function clearReservedStock(variantId: string): Promise<void> {
  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) throw new Error("Variant not found");
  if (variant.reservedStock === 0) return;

  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      stock: variant.stock + variant.reservedStock,
      reservedStock: 0,
      reservedNote: null,
    },
  });
}

/**
 * Manually adjust actual stock by delta. Floors at 0.
 */
export async function manualAdjustActual(
  variantId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;

  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) throw new Error("Variant not found");

  const newStock = Math.max(0, variant.stock + delta);

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { stock: newStock },
  });
}

// ---------------------------------------------------------------------------
// Stock records (booking + arrival)
// ---------------------------------------------------------------------------

/**
 * Create a stock booking record (Stock button).
 * Creates a StockRecord with state BOOKED and increments variant.bookedStock.
 */
export async function createStockRecord(
  variantId: string,
  quantity: number,
  unitCost: number,
): Promise<string> {
  if (quantity <= 0) throw new Error("Quantity must be positive");
  if (unitCost < 0) throw new Error("Unit cost cannot be negative");

  const prisma = getPrisma();

  // Fetch variant + product for denormalized snapshot
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      condition: true,
      isFoil: true,
      product: { select: { name: true } },
    },
  });
  if (!variant) throw new Error("Variant not found");

  const record = await prisma.stockRecord.create({
    data: {
      variantId,
      quantity,
      unitCost,
      state: "BOOKED",
      productName: variant.product.name,
      variantCondition: variant.condition,
      variantIsFoil: variant.isFoil,
    },
  });

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { bookedStock: { increment: quantity } },
  });

  return record.id;
}

/**
 * Mark a stock record as arrived (one-way toggle).
 * Transfers quantity from bookedStock to stock (actual).
 * Throws if record is already ARRIVED or not found.
 */
export async function arriveStockRecord(
  recordId: string,
  arrivedAt: Date,
  note?: string,
): Promise<void> {
  const prisma = getPrisma();
  const record = await prisma.stockRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) throw new Error("Stock record not found");
  if (record.state === "ARRIVED") {
    throw new Error("Stock record is already marked as arrived");
  }

  // Update record state
  await prisma.stockRecord.update({
    where: { id: recordId },
    data: {
      state: "ARRIVED",
      arrivedAt,
      arrivalNote: note ?? null,
    },
  });

  // Transfer: bookedStock -= quantity, stock += quantity
  // Skip if variant was deleted (variantId is null)
  if (record.variantId) {
    await prisma.productVariant.update({
      where: { id: record.variantId },
      data: {
        bookedStock: { decrement: record.quantity },
        stock: { increment: record.quantity },
      },
    });
  }
}
