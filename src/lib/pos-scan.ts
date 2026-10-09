export const BARCODE_MAX_LENGTH = 64;

export type PosScanMatchBy = "barcode" | "sku" | "cardNumber";

export interface PosScanVariant {
  id: string;
  sku: string;
  barcode?: string | null;
  stock: number;
}

export interface PosScanProduct {
  cardNumber?: string | null;
  variants: PosScanVariant[];
}

export interface PosScanMatch<T extends PosScanProduct> {
  product: T;
  variantId: string;
  matchedBy: PosScanMatchBy;
}

function sameCode(value: string | null | undefined, query: string) {
  return (value ?? "").trim().toLowerCase() === query;
}

/** Empty or whitespace becomes null. Throws on an over-long or invalid code. */
export function normalizeBarcode(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("條碼格式不正確");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > BARCODE_MAX_LENGTH) {
    throw new Error("條碼不可超過 64 個字");
  }
  if (/[\u0000-\u001f]/.test(trimmed)) {
    throw new Error("條碼格式不正確");
  }
  return trimmed;
}

/**
 * Exact cashier lookup. Barcode wins, then SKU, then a card number that
 * matches exactly one product. Name search stays on the product list.
 */
export function matchPosScan<T extends PosScanProduct>(
  products: T[],
  raw: string,
): PosScanMatch<T> | null {
  const query = raw.trim().toLowerCase();
  if (!query) return null;

  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.barcode && sameCode(variant.barcode, query)) {
        return { product, variantId: variant.id, matchedBy: "barcode" };
      }
    }
  }

  for (const product of products) {
    for (const variant of product.variants) {
      if (sameCode(variant.sku, query)) {
        return { product, variantId: variant.id, matchedBy: "sku" };
      }
    }
  }

  const byCard = products.filter((product) => product.cardNumber && sameCode(product.cardNumber, query));
  if (byCard.length !== 1) return null;
  const product = byCard[0];
  const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
  if (!variant) return null;
  return { product, variantId: variant.id, matchedBy: "cardNumber" };
}
