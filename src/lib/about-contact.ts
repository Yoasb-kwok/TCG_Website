/** Previous default that stated a 1–2 working-day handling window. */
export const LEGACY_ABOUT_CONTACT_BODY =
  "如有商品查詢、預留或賽事報名問題，歡迎透過網站右下角 WhatsApp 按鈕與我們聯絡。\n\n線上訂單一般於 1–2 個工作天內處理；門市自取請待收到「可取貨」通知後前往。";

export const ABOUT_CONTACT_BODY =
  "如有商品查詢、預留或賽事報名問題，歡迎透過網站右下角 WhatsApp 按鈕與我們聯絡。\n\n現貨寄送、退換及預購取貨期限，以網站上的退換貨／送貨政策及服務及購物條款為準。";

/** Drop the retired handling-time sentence so About does not contradict the shipping policy. */
export function resolveAboutContactBody(
  stored: string | null | undefined,
  fallback = ABOUT_CONTACT_BODY,
): string {
  const value = (stored ?? "").replace(/\r\n/g, "\n");
  if (!value.trim() || value === LEGACY_ABOUT_CONTACT_BODY) return fallback;
  return value;
}
