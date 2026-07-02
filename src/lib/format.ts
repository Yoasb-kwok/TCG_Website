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

/** Format a Date as YYYYMMDDTHHMMSSZ for Google Calendar URLs */
function toGoogleCalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Generate a Google Calendar "Add Event" URL. Returns `null` if the date is invalid. */
export function googleCalendarUrl(opts: {
  title: string;
  startsAt: string;
  location: string;
  description?: string | null;
  format?: string;
  durationMinutes?: number;
}): string | null {
  const start = new Date(opts.startsAt);
  if (isNaN(start.getTime())) return null;

  const durationMs = (opts.durationMinutes ?? 180) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);

  const details = [
    opts.description,
    opts.format ? `賽制：${opts.format}` : null,
  ]
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
