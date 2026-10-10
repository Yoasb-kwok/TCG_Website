import { listCatalogCards, listCatalogCardsForCode, type CatalogCardDto } from "@/lib/catalog-query";
import {
  cardMatchesExactNumber,
  catalogResolvesProducts,
  classifyCatalogQuery,
  prefersExactCatalogCode,
  productOrFromCatalogCards,
} from "@/lib/catalog-resolve";
import { isDatabaseConfigured } from "@/lib/prisma";
import type { CatalogSearchHit } from "@/lib/types";

export interface CatalogProductSearch {
  cards: CatalogSearchHit[];
  total: number;
  /** Extra Product clauses. Empty for barcodes and broad set-wide queries. */
  productOr: Record<string, unknown>[];
}

const EMPTY: CatalogProductSearch = { cards: [], total: 0, productOr: [] };

function toHit(card: CatalogCardDto): CatalogSearchHit {
  return {
    id: card.id,
    setCode: card.setCode,
    setNameZhTw: card.setNameZhTw,
    collectorNumber: card.collectorNumber,
    altCollectorNumber: card.altCollectorNumber,
    nameZhTw: card.nameZhTw,
    nameJa: card.nameJa,
    nameEn: card.nameEn,
    imageUrl: card.imageUrl,
    rarity: card.rarity,
  };
}

/** Same catalog tables as GET /api/cards. Failures leave product search unchanged. */
export async function resolveCatalogProductSearch(raw: string): Promise<CatalogProductSearch> {
  const classified = classifyCatalogQuery(raw);
  if (classified.kind === "skip" || !isDatabaseConfigured()) return EMPTY;

  try {
    if (classified.kind === "text" && prefersExactCatalogCode(classified.search)) {
      const coded = await listCatalogCardsForCode(classified.search);
      if (coded.total > 0) {
        return {
          cards: coded.cards.map(toHit),
          total: coded.total,
          productOr: catalogResolvesProducts("text", coded.total)
            ? productOrFromCatalogCards(coded.cards, "text")
            : [],
        };
      }
    }

    const data = await listCatalogCards({
      setCode: classified.kind === "number" ? classified.setCode : undefined,
      number: classified.kind === "number" ? classified.number : undefined,
      search: classified.kind === "text" ? classified.search : undefined,
      page: 1,
      pageSize: classified.kind === "number" && classified.number.includes("/") ? 50 : 12,
    });
    const exact =
      classified.kind === "number" && classified.number.includes("/")
        ? data.cards.filter((card) => cardMatchesExactNumber(card, classified.number))
        : data.cards;
    const cards = exact.slice(0, 12);
    return {
      cards: cards.map(toHit),
      total: classified.kind === "number" && classified.number.includes("/") ? exact.length : data.total,
      productOr: catalogResolvesProducts(
        classified.kind,
        classified.kind === "number" && classified.number.includes("/") ? exact.length : data.total,
        classified.kind === "number" ? classified.number : undefined,
      )
        ? productOrFromCatalogCards(cards, classified.kind)
        : [],
    };
  } catch {
    return EMPTY;
  }
}
