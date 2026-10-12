/**
 * Decides when a storefront or POS search should also read the card catalog,
 * and which extra product clauses that read may add.
 * Barcode-shaped queries stay on Product / ProductVariant only.
 */

import { parseSetCollectorCode } from "@/lib/card-number-format";

export interface CatalogResolveCard {
  setCode: string;
  collectorNumber: string;
  altCollectorNumber?: string | null;
  nameZhTw?: string | null;
  nameJa?: string | null;
  nameEn?: string | null;
}

export type CatalogQueryClass =
  | { kind: "skip" }
  | { kind: "number"; setCode?: string; number: string }
  | { kind: "text"; search: string };

const BARCODE = /^\d{8,}$/;
const FRACTION = /^#?[ \t]*0*(\d{1,4})[ \t]*[/／\-\\][ \t]*0*(\d{1,4})$/;
const SET_FRACTION_SEPARATED =
  /^([A-Za-z][A-Za-z0-9.]*)[\s\-_]+#?[ \t]*0*(\d{1,4})[ \t]*[/／\-\\][ \t]*0*(\d{1,4})$/;
const SET_FRACTION_COMPACT =
  /^([A-Za-z][A-Za-z0-9.]*[A-Za-z])#?0*(\d{1,4})[ \t]*[/／\-\\][ \t]*0*(\d{1,4})$/;

function fractionNumber(index: string, total: string): string {
  const width = Math.max(3, index.length, total.length);
  return `${index.padStart(width, "0")}/${total.padStart(width, "0")}`;
}

function parseFractionQuery(raw: string): { setCode?: string; number: string } | null {
  const separated = raw.match(SET_FRACTION_SEPARATED);
  if (separated) {
    return { setCode: separated[1], number: fractionNumber(separated[2], separated[3]) };
  }
  const compact = raw.match(SET_FRACTION_COMPACT);
  if (compact) {
    return { setCode: compact[1], number: fractionNumber(compact[2], compact[3]) };
  }
  const plain = raw.match(FRACTION);
  if (plain) return { number: fractionNumber(plain[1], plain[2]) };
  return null;
}

export function classifyCatalogQuery(raw: string): CatalogQueryClass {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return { kind: "skip" };

  const compact = trimmed.replace(/\s+/g, "");
  if (BARCODE.test(compact)) return { kind: "skip" };

  const fraction = parseFractionQuery(trimmed);
  if (fraction) {
    return { kind: "number", setCode: fraction.setCode, number: fraction.number };
  }

  const setIndex = parseSetCollectorCode(trimmed);
  if (setIndex) {
    return { kind: "number", setCode: setIndex.setCode, number: setIndex.index };
  }

  if (/^\d{2,4}$/.test(compact)) return { kind: "number", number: compact };
  return { kind: "text", search: trimmed };
}

/** A full collector number, or a name that only hits a handful of cards. */
export function catalogResolvesProducts(
  kind: "number" | "text",
  total: number,
  number?: string,
): boolean {
  if (total <= 0) return false;
  if (kind === "number") return Boolean(number?.includes("/")) && total <= 20;
  return total <= 8;
}

/** Set codes and energy codes such as M6a or GRA. Not a card name. */
export function prefersExactCatalogCode(raw: string): boolean {
  return /^[A-Za-z][A-Za-z0-9._-]{1,7}$/.test(raw.trim());
}

export function cardMatchesExactNumber(
  card: { collectorNumber: string; altCollectorNumber?: string | null },
  number: string,
): boolean {
  const target = number.trim().toLowerCase();
  if (!target) return false;
  if (card.collectorNumber.trim().toLowerCase() === target) return true;
  return (card.altCollectorNumber ?? "")
    .split(/[,，]/)
    .some((part) => part.trim().toLowerCase() === target);
}

function cleanName(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "待補") return null;
  return trimmed;
}

function collectorNumbers(card: CatalogResolveCard): string[] {
  const extras = (card.altCollectorNumber ?? "")
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const primary = card.collectorNumber.trim();
  return primary ? [primary, ...extras] : extras;
}

/**
 * Number queries also match singles stored under the official card name.
 * Name queries match singles stored under that card's collector number.
 * Clauses use equals, so a set-wide search cannot pull in every same-named card.
 */
export function productOrFromCatalogCards(
  cards: readonly CatalogResolveCard[],
  kind: "number" | "text",
): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  const push = (key: string, clause: Record<string, unknown>) => {
    if (seen.has(key)) return;
    seen.add(key);
    clauses.push(clause);
  };

  if (kind === "number") {
    for (const card of cards) {
      for (const name of [card.nameZhTw, card.nameJa, card.nameEn]) {
        const clean = cleanName(name);
        if (!clean) continue;
        push(`name:${clean.toLowerCase()}`, {
          name: { equals: clean, mode: "insensitive" },
        });
      }
    }
  }

  for (const card of cards) {
    for (const number of collectorNumbers(card)) {
      push(`num:${number.toLowerCase()}`, {
        cardNumber: { equals: number, mode: "insensitive" },
      });
    }
    const setCode = card.setCode.trim();
    const primary = card.collectorNumber.trim();
    if (setCode && primary) {
      push(`set:${setCode.toLowerCase()}:${primary.toLowerCase()}`, {
        AND: [
          { setCode: { equals: setCode, mode: "insensitive" } },
          { cardNumber: { equals: primary, mode: "insensitive" } },
        ],
      });
    }
  }

  return clauses;
}
