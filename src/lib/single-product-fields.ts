import { taxonomyFromCard } from "@/lib/card-taxonomy";

export interface SingleProductFieldInput {
  name: string;
  setCode?: string;
  rarityTier?: string;
  cardCategory?: string;
  cardNumber?: string;
  pokemonType?: string;
  description?: string;
}

export interface SingleProductSortMaps {
  setCode: Record<string, number>;
  rarityTier: Record<string, number>;
}

/**
 * Fields for a single-card re-save.
 * Blank series, rarity, and card category are left off the patch so an imported
 * PCS row can be saved again without those values, and without stamping OTHER.
 */
export interface SingleProductWrite {
  name: string;
  description?: string;
  cardSet?: string;
  setCode?: string;
  setSortIndex?: number;
  cardNumber: string | null;
  rarity?: string;
  rarityTier?: string;
  raritySortIndex?: number;
  cardCategory?: string;
  pokemonType: string | null;
}

export function singleProductFieldPatch(
  input: SingleProductFieldInput,
  sortMaps?: SingleProductSortMaps,
): SingleProductWrite {
  const setCode = input.setCode?.trim() ?? "";
  const rarityTier = input.rarityTier?.trim() ?? "";
  const cardCategory = input.cardCategory?.trim() ?? "";
  const cardNumber = input.cardNumber?.trim() ?? "";
  const pokemonType = input.pokemonType?.trim() ?? "";
  const taxonomy = taxonomyFromCard({
    setCode: setCode || null,
    rarityTier: rarityTier || null,
    name: input.name,
  });
  const generated = [setCode, cardNumber ? `#${cardNumber}` : null, cardCategory, pokemonType]
    .filter(Boolean)
    .join(" · ");
  const explicitDescription = input.description?.trim() ?? "";
  const description = explicitDescription || generated;

  return {
    name: input.name,
    ...(description ? { description } : {}),
    ...(setCode
      ? {
          cardSet: setCode,
          setCode: taxonomy.setCode,
          setSortIndex: sortMaps?.setCode[taxonomy.setCode] ?? taxonomy.setSortIndex,
        }
      : {}),
    cardNumber: cardNumber || null,
    ...(rarityTier
      ? {
          rarity: rarityTier,
          rarityTier: taxonomy.rarityTier,
          raritySortIndex: sortMaps?.rarityTier[taxonomy.rarityTier] ?? taxonomy.raritySortIndex,
        }
      : {}),
    ...(cardCategory ? { cardCategory } : {}),
    pokemonType: pokemonType || null,
  };
}
