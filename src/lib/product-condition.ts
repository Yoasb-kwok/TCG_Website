/**
 * 品相 is a single-card grade. Sealed product, accessories, gift boxes, and food
 * do not show it, even when a variant still stores "Sealed" or "New".
 */
export function showsProductCondition(type: string | null | undefined): boolean {
  return type === "SINGLE";
}

const GENERIC_STOCK_CONDITIONS = new Set(["", "sealed", "new", "新品", "未開封"]);

/** Cart lines saved before productType existed hide generic sealed/new labels. */
export function cartLineShowsCondition(item: {
  condition: string;
  productType?: string | null;
}): boolean {
  if (item.productType) return showsProductCondition(item.productType);
  return !GENERIC_STOCK_CONDITIONS.has(item.condition.trim().toLowerCase());
}
