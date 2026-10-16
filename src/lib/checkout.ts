export const FREE_SHIPPING_THRESHOLD = 500;
export const SHIPPING_FEE = 30;

/** Checkout delivery choice. COD is courier cash-on-delivery: the store does not charge shipping. */
export const SHIPPING_METHODS = ["PICKUP", "PREPAID", "COD"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  PICKUP: "門市自取（免運費）",
  PREPAID: "本地運費（順豐）",
  COD: "速遞到付",
};

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return value === "PICKUP" || value === "PREPAID" || value === "COD";
}

export function shippingMethodLabel(method: unknown): string | null {
  return isShippingMethod(method) ? SHIPPING_METHOD_LABELS[method] : null;
}

export function calculateShipping(subtotal: number, method: ShippingMethod): number {
  if (method === "PICKUP" || method === "COD") return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEE;
}

/**
 * Prefer an explicit shippingMethod. Older clients only sent pickup=true for store pickup.
 */
export function resolveShippingMethod(input: {
  shippingMethod?: unknown;
  pickup?: unknown;
}): { ok: true; method: ShippingMethod } | { ok: false; error: string } {
  if (input.shippingMethod !== undefined && input.shippingMethod !== null && input.shippingMethod !== "") {
    const value = String(input.shippingMethod).trim().toUpperCase();
    if (isShippingMethod(value)) return { ok: true, method: value };
    return { ok: false, error: "請選擇送貨方式" };
  }
  if (input.pickup === true || input.pickup === "true" || input.pickup === "1" || input.pickup === 1) {
    return { ok: true, method: "PICKUP" };
  }
  return { ok: true, method: "PREPAID" };
}

export function toAbsoluteImageUrl(url: string | undefined, appUrl: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = appUrl.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}
