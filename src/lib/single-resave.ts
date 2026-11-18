/**
 * Client payload for re-saving an existing single-card row.
 * Imported PCS rows are stored as SINGLE and often have no set code or rarity.
 * Blank values stay blank. This does not pick a series or a rarity tier.
 */
export function existingSingleTaxonomyPayload(input: {
  setCode: string;
  rarityTier: string;
  cardNumber: string;
  cardCategory: string;
}) {
  return {
    setCode: input.setCode.trim() || null,
    rarityTier: input.rarityTier.trim() || null,
    cardNumber: input.cardNumber.trim() || undefined,
    cardCategory: input.cardCategory,
  };
}

/**
 * Set code, rarity, and card category are not required on re-save.
 * Imported PCS rows often have none of them. New singles still use the create form.
 */
export function existingSingleResaveError(input: { name: string }): string | null {
  if (!input.name.trim()) return "請填寫名稱";
  return null;
}
