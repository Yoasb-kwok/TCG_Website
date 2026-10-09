/**
 * Shared catalog search for admin, storefront, and POS.
 * Matches name, description, set, set code, card number, SKU, and barcode
 * when a variant already carries one.
 *
 * Card numbers match the stored text plus common staff input:
 * 083/101, #083/101, 083-101, 083 / 101, and a partial index such as 083.
 * A padded query also matches an unpadded stored number (083/101 → 83/101).
 */

export interface SearchableVariant {
  sku?: string | null;
  barcode?: string | null;
}

export interface SearchableProduct {
  name?: string | null;
  description?: string | null;
  cardSet?: string | null;
  cardNumber?: string | null;
  setCode?: string | null;
  rarity?: string | null;
  rarityTier?: string | null;
  externalCardId?: string | null;
  variants?: readonly SearchableVariant[] | null;
}

export interface SearchableOption {
  value: string;
  label: string;
  parentValue?: string | null;
  cardSuffix?: string | null;
}

const TEXT_FIELDS = [
  "name",
  "description",
  "cardSet",
  "cardNumber",
  "setCode",
  "rarity",
  "rarityTier",
  "externalCardId",
] as const;

const CARD_NUMBER = /^0*(\d{1,4})[/／\\\-]0*(\d{1,4})$/;

function addNeedle(needles: Set<string>, value: string) {
  const next = value.trim();
  if (next) needles.add(next);
}

/** Distinct substrings to look for. Empty when the query is blank. */
export function productSearchNeedles(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const needles = new Set<string>();
  addNeedle(needles, trimmed);

  const withoutHash = trimmed.replace(/^#+/, "").trim();
  addNeedle(needles, withoutHash);

  const compact = withoutHash.replace(/\s+/g, "");
  addNeedle(needles, compact);

  const card = compact.match(CARD_NUMBER);
  if (card) {
    const index = String(Number(card[1]));
    const suffix = String(Number(card[2]));
    addNeedle(needles, `${index}/${suffix}`);
    addNeedle(needles, `${index.padStart(3, "0")}/${suffix}`);
    addNeedle(needles, `${index.padStart(3, "0")}/${suffix.padStart(3, "0")}`);
  }

  return [...needles];
}

function fieldContains(value: string | null | undefined, needles: string[]): boolean {
  if (!value) return false;
  const haystack = value.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

export function productMatchesSearch(product: SearchableProduct, raw: string): boolean {
  const needles = productSearchNeedles(raw).map((needle) => needle.toLowerCase());
  if (needles.length === 0) return true;

  const fields = [
    product.name,
    product.description,
    product.cardSet,
    product.cardNumber,
    product.setCode,
    product.rarity,
    product.rarityTier,
    product.externalCardId,
  ];
  if (fields.some((field) => fieldContains(field, needles))) return true;

  return (product.variants ?? []).some(
    (variant) => fieldContains(variant.sku, needles) || fieldContains(variant.barcode, needles),
  );
}

export function optionMatchesSearch(option: SearchableOption, raw: string): boolean {
  return productMatchesSearch(
    {
      name: option.label,
      description: option.cardSuffix,
      cardSet: option.value,
      cardNumber: option.value,
      setCode: option.parentValue ?? option.value,
    },
    raw,
  );
}

type ContainsFilter = { contains: string; mode: "insensitive" };

/** Prisma OR clauses, including variant SKU and barcode. */
export function productSearchOr(raw: string): Record<string, unknown>[] {
  const needles = productSearchNeedles(raw);
  const clauses: Record<string, unknown>[] = [];

  for (const needle of needles) {
    const contains: ContainsFilter = { contains: needle, mode: "insensitive" };
    for (const field of TEXT_FIELDS) {
      clauses.push({ [field]: contains });
    }
    clauses.push({ variants: { some: { sku: contains } } });
    clauses.push({ variants: { some: { barcode: contains } } });
  }

  return clauses;
}
