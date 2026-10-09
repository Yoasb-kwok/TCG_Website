import { STORE } from "@/lib/constants";

/**
 * Build a wa.me link from a shop number.
 * Accepts an 8-digit Hong Kong number, a number that already includes 852, or a full https://wa.me/<digits> URL.
 */
export function whatsappHrefFromInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const direct = trimmed.match(/^https:\/\/wa\.me\/(\d{8,15})\/?$/);
  if (direct) return `https://wa.me/${direct[1]}`;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) digits = `852${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

/**
 * Env `WHATSAPP_NUMBER` overrides the site config number in `STORE.whatsapp`.
 * An invalid env value falls back to the configured shop number.
 */
export function resolveWhatsAppHref(
  envValue: string | null | undefined = process.env.WHATSAPP_NUMBER,
): string | null {
  return whatsappHrefFromInput(envValue) ?? whatsappHrefFromInput(STORE.whatsapp);
}

export function whatsappDisplayNumber(href: string | null): string | null {
  if (!href) return null;
  const digits = href.replace(/\D/g, "");
  const local = digits.startsWith("852") && digits.length === 11 ? digits.slice(3) : digits;
  if (local.length === 8) return `${local.slice(0, 4)} ${local.slice(4)}`;
  return local || null;
}
