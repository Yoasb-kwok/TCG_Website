/**
 * Shared tournament status presentation — labels and badge colors.
 *
 * Used by the public calendar, list card, detail dialogs, and the admin
 * monitor page so every surface shows the same colour for a given status.
 */

/** Chinese status labels keyed by status string. */
export const STATUS_LABELS: Record<string, string> = {
  OPEN: "報名中",
  FULL: "已滿",
  IN_PROGRESS: "進行中",
  COMPLETED: "已結束",
  DRAFT: "草稿",
  CANCELLED: "已取消",
  DEADLINE_PASSED: "已截止",
};

/**
 * Solid badge background classes per status — matches the calendar colour
 * scheme (green / orange / blue / gray / slate / red).
 *
 * Pair with `<Badge variant="secondary" className={...} />` so the Badge's
 * default border and padding are kept while the background is overridden.
 */
export const STATUS_BADGE_CLASS: Record<string, string> = {
  OPEN: "bg-green-600 text-white",
  FULL: "bg-orange-500 text-white",
  IN_PROGRESS: "bg-blue-600 text-white",
  DEADLINE_PASSED: "bg-gray-500 text-white",
  COMPLETED: "bg-slate-600 text-white",
  CANCELLED: "bg-red-600 text-white",
  DRAFT: "",
};

/** Convenience: resolve label with fallback to the raw status string. */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Convenience: resolve badge class with fallback to empty (uses Badge default). */
export function statusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS[status] ?? "";
}
