export const FREE_SHIPPING_THRESHOLD = 500;
export const SHIPPING_FEE = 30;

export function calculateShipping(subtotal: number, pickup: boolean): number {
  if (pickup || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEE;
}

export function toAbsoluteImageUrl(url: string | undefined, appUrl: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = appUrl.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}
