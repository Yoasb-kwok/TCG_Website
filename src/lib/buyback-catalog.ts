import { formatStaffMoney } from "@/lib/format";
import { roundMoney } from "@/lib/pos-shared";

/** Matches the one-off buyback unit-price cap. A catalog offer is not a transaction. */
export const CATALOG_BUYBACK_PRICE_MAX = 1_000_000;
export const CATALOG_TARGET_BUYBACK_QTY_MAX = 999_999;

export type CatalogBuybackWrite = {
  buybackPrice?: number | null;
  targetBuybackQty?: number | null;
};

export function parseCatalogBuybackPrice(
  value: unknown,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (isBlank(value)) return { ok: true, value: null };
  const amount = readNumber(value);
  if (amount == null || amount < 0 || amount > CATALOG_BUYBACK_PRICE_MAX) {
    return { ok: false, error: "回收價必須是 0 至 1,000,000 的金額" };
  }
  return { ok: true, value: roundMoney(amount) };
}

export function parseTargetBuybackQty(
  value: unknown,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (isBlank(value)) return { ok: true, value: null };
  const amount = readNumber(value);
  if (
    amount == null ||
    !Number.isInteger(amount) ||
    amount < 0 ||
    amount > CATALOG_TARGET_BUYBACK_QTY_MAX
  ) {
    return { ok: false, error: "希望回收數量必須是 0 至 999,999 的整數" };
  }
  return { ok: true, value: amount };
}

/** Create path. A missing value is stored as unset. */
export function catalogBuybackPayload(buybackPrice: unknown, targetBuybackQty: unknown) {
  const price = parseCatalogBuybackPrice(buybackPrice);
  if (!price.ok) return price;
  const quantity = parseTargetBuybackQty(targetBuybackQty);
  if (!quantity.ok) return quantity;
  return {
    ok: true as const,
    buybackPrice: price.value,
    targetBuybackQty: quantity.value,
  };
}

/**
 * Edit path. Keys that the client did not send stay unchanged,
 * so an older request cannot wipe a saved offer.
 */
export function catalogBuybackPatch(
  body: object,
): { ok: true; data: CatalogBuybackWrite } | { ok: false; error: string } {
  const data: CatalogBuybackWrite = {};
  if ("buybackPrice" in body) {
    const price = parseCatalogBuybackPrice(body.buybackPrice);
    if (!price.ok) return price;
    data.buybackPrice = price.value;
  }
  if ("targetBuybackQty" in body) {
    const quantity = parseTargetBuybackQty(body.targetBuybackQty);
    if (!quantity.ok) return quantity;
    data.targetBuybackQty = quantity.value;
  }
  return { ok: true, data };
}

export function catalogBuybackPriceLabel(price: number | null | undefined) {
  if (typeof price !== "number" || !Number.isFinite(price)) return "回收價 未設定";
  return `回收價 ${formatStaffMoney(price)}`;
}

export function catalogTargetBuybackQtyLabel(quantity: number | null | undefined) {
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) return "希望回收數量 未設定";
  return `希望回收數量 ${quantity}`;
}

function isBlank(value: unknown) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function readNumber(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(amount)) return null;
  return amount;
}
