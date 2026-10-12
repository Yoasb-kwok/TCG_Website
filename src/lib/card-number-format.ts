/** 格式化單張卡號：001/063 */
export function formatCardNumber(
  num: number,
  suffix: string,
  padWidth = 3,
): string {
  const n = Math.max(0, Math.floor(num));
  const padded = String(n).padStart(padWidth, "0");
  const cleanSuffix = suffix.replace(/^\//, "").trim();
  return `${padded}/${cleanSuffix}`;
}

/** 依最小～最大編號產生卡號列表 */
export function generateCardNumberRange(
  min: number,
  max: number,
  suffix: string,
  padWidth = 3,
): { value: string; label: string }[] {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const width = Math.max(padWidth, String(hi).length);
  const out: { value: string; label: string }[] = [];
  for (let i = lo; i <= hi; i++) {
    const value = formatCardNumber(i, suffix, width);
    out.push({ value, label: `#${value}` });
  }
  return out;
}

/** 從完整卡號解析編號部分（001/063 → 1） */
export function parseCardNumberIndex(cardNumber: string): number | null {
  const m = cardNumber.trim().match(/^(\d+)\//);
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

/** 保留卡號前綴，替換 / 後的系列後綴（001/080 + 083 → 001/083） */
export function replaceCardNumberSuffix(
  cardNumber: string,
  newSuffix: string,
): string | null {
  const m = cardNumber.trim().match(/^(\d+)\/\d+$/);
  if (!m) return null;
  const cleanSuffix = newSuffix.replace(/^\//, "").trim();
  if (!cleanSuffix) return null;
  return `${m[1]}/${cleanSuffix}`;
}

export function cardNumberLabel(cardNumber: string): string {
  return `#${cardNumber}`;
}

export interface SetCollectorCode {
  setCode: string;
  /** Zero-padded collector index, at least 3 digits (001). */
  index: string;
}

export type CollectorIndexMatch =
  | { startsWith: string; mode: "insensitive" }
  | { equals: string; mode: "insensitive" }
  | { contains: string; mode: "insensitive" };

const SET_INDEX_SEPARATED = /^([A-Za-z][A-Za-z0-9.]*)[\s\-_]+#?(\d{1,4})$/;
const SET_INDEX_COMPACT = /^([A-Za-z][A-Za-z0-9.]*[A-Za-z])#?(\d{2,4})$/;

export function padCollectorIndex(digits: string): string {
  const numeric = String(Number(digits));
  return numeric.padStart(Math.max(3, digits.length), "0");
}

/**
 * Set code plus collector index, ignoring spaces, hyphens, and underscores
 * between them: `M6a 001`, `M6a-001`, `M6a_001`, `M6a001`.
 * A compact code must end the set portion on a letter so `M6a001` is M6a + 001.
 */
export function parseSetCollectorCode(raw: string): SetCollectorCode | null {
  const trimmed = raw.trim().replace(/^#+/, "").trim();
  if (!trimmed) return null;

  const separated = trimmed.match(SET_INDEX_SEPARATED);
  if (separated) {
    return { setCode: separated[1], index: padCollectorIndex(separated[2]) };
  }

  const compact = trimmed.match(SET_INDEX_COMPACT);
  if (compact) {
    return { setCode: compact[1], index: padCollectorIndex(compact[2]) };
  }

  return null;
}

/** Canonical key for `M6a 001` / `M6a001` / `M6a-001`. Null when it is not that shape. */
export function normalizeSetCollectorCode(raw: string): string | null {
  const parsed = parseSetCollectorCode(raw);
  if (!parsed) return null;
  return `${parsed.setCode}${parsed.index}`.toLowerCase();
}

export function sameCollectorCode(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const leftKey = normalizeSetCollectorCode(left);
  const rightKey = normalizeSetCollectorCode(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

/** Leading index of `001/103` or `83/101` as a padded string. Combined codes return null. */
export function leadingCollectorIndex(cardNumber: string): string | null {
  const match = cardNumber.trim().match(/^0*(\d{1,4})(?!\d)/);
  if (!match) return null;
  return padCollectorIndex(match[1]);
}

export function productMatchesSetCollector(
  product: {
    setCode?: string | null;
    cardNumber?: string | null;
    externalCardId?: string | null;
  },
  raw: string,
): boolean {
  const parsed = parseSetCollectorCode(raw);
  if (!parsed) return false;
  if (product.cardNumber && sameCollectorCode(product.cardNumber, raw)) return true;
  if (product.externalCardId && sameCollectorCode(product.externalCardId, raw)) return true;
  if (!product.setCode || !product.cardNumber) return false;
  if (product.setCode.trim().toLowerCase() !== parsed.setCode.toLowerCase()) return false;
  return leadingCollectorIndex(product.cardNumber) === parsed.index;
}

/**
 * Lookup strings that should compare equal to this set+index query.
 * Contains-search uses the padded forms only. Exact POS lookup can also ask
 * for the unpadded index (`M6a-1`) because equality does not prefix-match.
 */
export function setCollectorCodeForms(raw: string, options?: { unpadded?: boolean }): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const forms = new Set<string>([trimmed]);
  const parsed = parseSetCollectorCode(trimmed);
  if (!parsed) return [...forms];
  const indexes = new Set([parsed.index]);
  if (options?.unpadded) indexes.add(String(Number(parsed.index)));
  for (const index of indexes) {
    forms.add(`${parsed.setCode}${index}`);
    forms.add(`${parsed.setCode}-${index}`);
    forms.add(`${parsed.setCode}_${index}`);
    forms.add(`${parsed.setCode} ${index}`);
  }
  return [...forms];
}

/** Match `001/103`, `001`, and an unpadded `1/103` without matching every `/103`. */
export function collectorIndexMatches(index: string): CollectorIndexMatch[] {
  const padded = padCollectorIndex(index);
  const bare = String(Number(padded));
  const matches: CollectorIndexMatch[] = [
    { startsWith: `${padded}/`, mode: "insensitive" },
    { equals: padded, mode: "insensitive" },
  ];
  if (bare !== padded) {
    matches.push(
      { startsWith: `${bare}/`, mode: "insensitive" },
      { equals: bare, mode: "insensitive" },
    );
  }
  return matches;
}

/** Same index on a comma-separated alternate number such as `002/086, 001/103`. */
export function alternateCollectorIndexMatches(index: string): CollectorIndexMatch[] {
  const padded = padCollectorIndex(index);
  const bare = String(Number(padded));
  const matches: CollectorIndexMatch[] = [
    { contains: `${padded}/`, mode: "insensitive" },
    { equals: padded, mode: "insensitive" },
  ];
  if (bare !== padded) {
    matches.push(
      { contains: `${bare}/`, mode: "insensitive" },
      { equals: bare, mode: "insensitive" },
    );
  }
  return matches;
}

export function collectorNumberOr(index: string): Record<string, unknown>[] {
  return [
    ...collectorIndexMatches(index).map((filter) => ({ collectorNumber: filter })),
    ...alternateCollectorIndexMatches(index).map((filter) => ({ altCollectorNumber: filter })),
  ];
}

/** Catalog AND clause: set code M6a and collector index 001. */
export function setIndexCatalogAnd(raw: string): Record<string, unknown> | null {
  const parsed = parseSetCollectorCode(raw);
  if (!parsed) return null;
  return {
    AND: [
      { set: { code: { equals: parsed.setCode, mode: "insensitive" } } },
      { OR: collectorNumberOr(parsed.index) },
    ],
  };
}
