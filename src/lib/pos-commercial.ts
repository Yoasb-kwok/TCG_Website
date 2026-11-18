import { formatPrice, formatStaffMoney } from "@/lib/format";

/** Shown when the SKU is flagged for member discount but no absolute member price is set. */
export const MEMBER_RATE_UNSET = "會員折扣率未設定，沿用售價";

export interface PosCommercial {
  price?: number;
  cost?: number | null;
  wholesalePrice?: number | null;
  memberPrice?: number | null;
  memberDiscount?: boolean;
  pointsProduct?: boolean;
  barcode?: string | null;
  /** Second scan code. Scanning it resolves the same variant as the primary barcode. */
  extendedBarcode?: string | null;
}

export function moneyAboveZero(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Sale `unitCost` follows catalog cost only when that cost is above zero. */
export function saleUnitCost(variant: { cost?: number | null } | null | undefined): number {
  return moneyAboveZero(variant?.cost) ?? 0;
}

/**
 * Charged price stays the retail `price`.
 * `memberPrice` is a separate absolute price and is only usable when it is above zero.
 */
export function chargedUnitPrice(variant: { price: number }): number {
  return variant.price;
}

export function usableMemberPrice(
  variant: { memberPrice?: number | null } | null | undefined,
): number | null {
  return moneyAboveZero(variant?.memberPrice);
}

export function memberRateUnset(
  variant: { memberDiscount?: boolean; memberPrice?: number | null } | null | undefined,
): boolean {
  return variant?.memberDiscount === true && usableMemberPrice(variant) == null;
}

export function readExtendedBarcode(record: object | null | undefined): string | null {
  if (!record || !("extendedBarcode" in record)) return null;
  const value = (record as { extendedBarcode?: unknown }).extendedBarcode;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function moneyLabel(amount: number): string {
  return Number.isInteger(amount) ? formatPrice(amount) : formatStaffMoney(amount);
}

/** Staff-facing facts. Member discount is yes/no. A missing rate is not turned into a percentage. */
export function commercialFacts(variant: PosCommercial | null | undefined): string[] {
  if (!variant) return [];
  const facts: string[] = [];
  if (variant.barcode) facts.push(`條碼 ${variant.barcode}`);
  const secondCode = readExtendedBarcode(variant);
  if (secondCode) facts.push(`第二條碼 ${secondCode}`);
  const cost = moneyAboveZero(variant.cost);
  if (cost != null) facts.push(`進貨 ${moneyLabel(cost)}`);
  if (typeof variant.wholesalePrice === "number" && Number.isFinite(variant.wholesalePrice)) {
    facts.push(`批發 ${moneyLabel(variant.wholesalePrice)}`);
  }
  const member = usableMemberPrice(variant);
  if (member != null) facts.push(`會員價 ${moneyLabel(member)}`);
  facts.push(`會員折扣 ${variant.memberDiscount ? "是" : "否"}`);
  if (memberRateUnset(variant)) facts.push(MEMBER_RATE_UNSET);
  facts.push(`積分商品 ${variant.pointsProduct ? "是" : "否"}`);
  return facts;
}

export function scanAddedText(name: string, variant: PosCommercial & { stock: number }): string {
  const stock = variant.stock <= 0 ? "而家無庫存" : `庫存 ${variant.stock}`;
  const member = usableMemberPrice(variant);
  const flags = [
    stock,
    variant.pointsProduct ? "積分商品" : null,
    variant.memberDiscount ? "會員折扣" : null,
    memberRateUnset(variant) ? "折扣率未設定，沿用售價" : null,
    member != null ? `會員價 ${moneyLabel(member)}` : null,
  ].filter((item): item is string => Boolean(item));
  return `已加入：${name}（${flags.join(" · ")}）`;
}
