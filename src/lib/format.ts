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
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(date));
}

/** Format a Date as YYYYMMDDTHHMMSSZ for Google Calendar URLs. */
function toGoogleCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Google Calendar "add event" URL.
 * Returns null when `startsAt` is missing or not a real date.
 * Duration defaults to 3 hours; tournaments on current main have no duration field.
 */
export function googleCalendarUrl(opts: {
  title: string;
  startsAt: string;
  location: string;
  description?: string | null;
  format?: string;
  durationMinutes?: number;
}): string | null {
  const start = new Date(opts.startsAt);
  if (Number.isNaN(start.getTime())) return null;

  const durationMs = (opts.durationMinutes ?? 180) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  const details = [opts.description, opts.format ? `賽制：${opts.format}` : null]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${toGoogleCalDate(start)}/${toGoogleCalDate(end)}`,
    details,
    location: opts.location,
    ctz: "Asia/Hong_Kong",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Calendar button target. Hidden for past, completed, cancelled, or bad dates. */
export function tournamentCalendarUrl(
  opts: {
    title: string;
    startsAt: string;
    location: string;
    description?: string | null;
    format?: string;
    status?: string;
    durationMinutes?: number;
  },
  now = new Date(),
): string | null {
  if (opts.status === "COMPLETED" || opts.status === "CANCELLED") return null;
  const start = new Date(opts.startsAt);
  if (Number.isNaN(start.getTime()) || start.getTime() < now.getTime()) return null;
  return googleCalendarUrl(opts);
}
