import { leadingCollectorIndex } from "@/lib/card-number-format";
import { formatStaffMoney } from "@/lib/format";
import { productSearchNeedles } from "@/lib/product-search";
import { normalizePhone } from "@/lib/registration-input";
import { roundMoney, type Buyback } from "@/lib/pos-shared";

export const BUYBACK_SOURCE = "buyback" as const;
export const BUYBACK_MAX_QUANTITY = 999;
export const BUYBACK_MAX_UNIT_PRICE = 1_000_000;

export type BuybackDraftInput = {
  quantity: number;
  unitBuyPrice: number;
  variantId?: string | null;
  catalogCardId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  pokemonId?: string | null;
  note?: string | null;
};

export type PreparedBuyback = {
  source: typeof BUYBACK_SOURCE;
  quantity: number;
  unitBuyPrice: number;
  totalAmount: number;
  variantId: string | null;
  catalogCardId: string | null;
  customerName: string;
  customerPhone: string;
  pokemonId: string;
  note: string;
};

export type CatalogCardMatch = {
  id?: string;
  setCode: string;
  collectorNumber: string;
  altCollectorNumber?: string | null;
};

export type CatalogProductMatch = {
  setCode?: string | null;
  cardSet?: string | null;
  cardNumber?: string | null;
  externalCardId?: string | null;
};

const HKT = "Asia/Hong_Kong";

export function catalogExternalId(catalogCardId: string) {
  return `catalog:${catalogCardId}`;
}

export function buybackTotal(quantity: number, unitBuyPrice: number) {
  return roundMoney(quantity * unitBuyPrice);
}

function cleanId(value: string | null | undefined): { ok: true; id: string | null } | { ok: false } {
  const id = value?.trim() ?? "";
  if (!id) return { ok: true, id: null };
  if (id.length > 64) return { ok: false };
  return { ok: true, id };
}

function sameCardNumber(stored: string, raw: string) {
  const left = productSearchNeedles(stored).map((needle) => needle.toLowerCase());
  const right = new Set(productSearchNeedles(raw).map((needle) => needle.toLowerCase()));
  return left.some((needle) => right.has(needle));
}

/**
 * A listed product is the same physical card as a catalog row when the set
 * matches and the collector number matches, including spaced input such as
 * `083 / 101`. An explicit catalog external id also matches.
 */
export function catalogCardMatchesProduct(product: CatalogProductMatch, card: CatalogCardMatch) {
  if (card.id && product.externalCardId === catalogExternalId(card.id)) return true;
  const productSet = (product.setCode || product.cardSet || "").trim().toLowerCase();
  if (!productSet || productSet !== card.setCode.trim().toLowerCase()) return false;
  const stored = (product.cardNumber ?? "").trim();
  if (!stored) return false;
  if (sameCardNumber(stored, card.collectorNumber)) return true;
  if (card.altCollectorNumber && sameCardNumber(stored, card.altCollectorNumber)) return true;
  const storedIndex = leadingCollectorIndex(stored);
  const cardIndex = leadingCollectorIndex(card.collectorNumber);
  return Boolean(storedIndex && cardIndex && storedIndex === cardIndex);
}

export function pickBuybackVariant<T extends { condition: string; isFoil: boolean; price: number }>(
  variants: readonly T[],
): T | null {
  if (variants.length === 0) return null;
  const rank = (variant: T) => {
    const nm = /near mint|(^|[^a-z])nm([^a-z]|$)/i.test(variant.condition);
    if (nm && !variant.isFoil) return 0;
    if (nm && variant.isFoil) return 1;
    if (!variant.isFoil) return 2;
    return 3;
  };
  return [...variants].sort((a, b) => rank(a) - rank(b) || a.price - b.price)[0] ?? null;
}

export function catalogListingName(card: {
  nameZhTw?: string | null;
  nameJa?: string | null;
  nameEn?: string | null;
  setCode: string;
  collectorNumber: string;
}) {
  const name = [card.nameZhTw, card.nameJa, card.nameEn].find(
    (value) => value && value.trim() && value.trim() !== "待補",
  );
  const title = name?.trim() || "待補";
  return `${title} ${card.setCode} ${card.collectorNumber}`.replace(/\s+/g, " ").trim();
}

/** Hong Kong calendar day as YYYY-MM-DD. The shop's "today" follows this, not UTC. */
export function hktDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HKT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hktDayRange(now = new Date()) {
  const key = hktDayKey(now);
  return {
    from: new Date(`${key}T00:00:00+08:00`),
    to: new Date(`${key}T23:59:59.999+08:00`),
  };
}

export function isWithinHktDay(iso: string, now = new Date()) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  return hktDayKey(at) === hktDayKey(now);
}

export function buybackDayTotal(rows: Pick<Buyback, "voided" | "totalAmount">[]) {
  return roundMoney(rows.filter((row) => !row.voided).reduce((sum, row) => sum + row.totalAmount, 0));
}

/** Staff-facing buyback row: the unit amount the shop pays the customer. */
export function buybackPriceCopy(row: Pick<Buyback, "voided" | "quantity" | "unitBuyPrice" | "totalAmount">) {
  const unit = `收取價錢 ${formatStaffMoney(row.unitBuyPrice)}`;
  const total = row.quantity > 1 ? ` · 合計 ${formatStaffMoney(row.totalAmount)}` : "";
  const status = row.voided ? " · 已撤銷" : "";
  return `${unit}${total}${status}`;
}

export function prepareBuyback(
  input: BuybackDraftInput,
): { ok: true; draft: PreparedBuyback } | { ok: false; error: string } {
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > BUYBACK_MAX_QUANTITY) {
    return { ok: false, error: "請填寫 1 至 999 的整數數量" };
  }

  const unitBuyPrice = Number(input.unitBuyPrice);
  if (!Number.isFinite(unitBuyPrice) || unitBuyPrice <= 0 || unitBuyPrice > BUYBACK_MAX_UNIT_PRICE) {
    return { ok: false, error: "請填寫收取價錢" };
  }

  const variant = cleanId(input.variantId);
  const catalog = cleanId(input.catalogCardId);
  if (!variant.ok || !catalog.ok) return { ok: false, error: "貨品不正確" };
  if (!variant.id && !catalog.id) return { ok: false, error: "請選擇貨品或卡表卡牌" };

  const customerName = input.customerName?.trim() ?? "";
  if (customerName.length > 40) return { ok: false, error: "姓名不可超過 40 字" };

  const rawPhone = input.customerPhone?.trim() ?? "";
  let customerPhone = "";
  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return { ok: false, error: "電話號碼必須為 8 位數字" };
    customerPhone = phone;
  }

  const pokemonId = input.pokemonId?.trim() ?? "";
  if (pokemonId.length > 32) return { ok: false, error: "Pokémon ID 不可超過 32 字" };

  const note = input.note?.trim() ?? "";
  if (note.length > 200) return { ok: false, error: "備註不可超過 200 字" };

  const price = roundMoney(unitBuyPrice);
  return {
    ok: true,
    draft: {
      source: BUYBACK_SOURCE,
      quantity,
      unitBuyPrice: price,
      totalAmount: buybackTotal(quantity, price),
      variantId: variant.id,
      catalogCardId: catalog.id,
      customerName,
      customerPhone,
      pokemonId,
      note,
    },
  };
}
