/** Defaults shown on the TCG-Pro OS landing calculator. */
export const ROI_DEFAULT_REVENUE = 120_000;
export const ROI_DEFAULT_EVENTS = 8;
export const ROI_REVENUE_MAX = 400_000;
export const ROI_REVENUE_STEP = 5_000;
export const ROI_EVENTS_MAX = 30;

/**
 * Landing-page estimate.
 * Online sales ≈ 35% of store revenue.
 * Hours saved ≈ 0.0003×HKD + 4×events.
 */
export function estimateProOsRoi(monthlyRevenueHkd: number, monthlyEvents: number) {
  const revenue = Math.max(0, monthlyRevenueHkd);
  const events = Math.max(0, monthlyEvents);
  return {
    onlineSalesHkd: Math.round(revenue * 0.35),
    hoursSaved: Math.round(revenue * 0.0003 + events * 4),
  };
}

export function formatHkd(amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 1;
  return `HK$ ${amount.toLocaleString("en-HK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
