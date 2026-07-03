export function formatPrice(amount: number, currency = "HKD"): string {
  return new Intl.NumberFormat("zh-HK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/** 將分鐘數格式化為中文時長（如 90 → 「1 小時 30 分鐘」）。 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} 小時`);
  if (m > 0) parts.push(`${m} 分鐘`);
  return parts.join(" ");
}
