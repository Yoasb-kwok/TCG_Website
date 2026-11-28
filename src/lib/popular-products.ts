/** Paid, shipped, and completed orders count as a finished purchase. Pending and cancelled do not. */
export const COMPLETED_PURCHASE_STATUSES = ["PAID", "SHIPPED", "COMPLETED"] as const;

export type PopularCandidate = {
  variants: { stock: number }[];
  /** Units sold on completed purchases. */
  purchaseCount: number;
  createdAt?: Date | string | null;
};

export function isInStockProduct(product: { variants: { stock: number }[] }): boolean {
  return product.variants.some((variant) => variant.stock > 0);
}

/**
 * Drop sold-out products, then take the top rows by completed purchase quantity.
 * Ties keep newer products first. The homepage SQL uses the same order.
 */
export function rankInStockProducts<T extends PopularCandidate>(products: T[], limit = 4): T[] {
  return products
    .filter(isInStockProduct)
    .slice()
    .sort((a, b) => {
      if (b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}
