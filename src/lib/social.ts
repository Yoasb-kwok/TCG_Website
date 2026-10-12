import { resolveWhatsAppHref } from "@/lib/whatsapp";

/** Brand mark rendered by the storefront social row. Unknown ids fall back to a generic link icon. */
export type SocialIconId = "instagram" | "facebook" | "whatsapp" | (string & {});

export type SocialLinkSlot = {
  id: string;
  /** Visible brand name. */
  label: string;
  /** Traditional Chinese accessible name. */
  accessibleName: string;
  /** Public URL. Empty hides the slot until an env override is set. */
  href: string;
  icon: SocialIconId;
  /** Server env var that overrides `href`. Example: SOCIAL_INSTAGRAM_URL. */
  envVar?: string;
};

export type ResolvedSocialLink = {
  id: string;
  label: string;
  accessibleName: string;
  href: string;
  icon: SocialIconId;
};

/**
 * Public social slots. Leave `href` empty so the live storefront stays free of
 * placeholder links. Set the matching env var (or fill `href` here) to show one.
 * Add another object to this list to introduce a new logo without changing the row component.
 */
export const SOCIAL_LINK_SLOTS: readonly SocialLinkSlot[] = [
  {
    id: "instagram",
    label: "Instagram",
    accessibleName: "前往 Instagram",
    href: "",
    icon: "instagram",
    envVar: "SOCIAL_INSTAGRAM_URL",
  },
  {
    id: "facebook",
    label: "Facebook",
    accessibleName: "前往 Facebook",
    href: "",
    icon: "facebook",
    envVar: "SOCIAL_FACEBOOK_URL",
  },
];

const WHATSAPP_SLOT = {
  id: "whatsapp",
  label: "WhatsApp",
  accessibleName: "WhatsApp 聯絡",
  icon: "whatsapp" as const,
};

/**
 * Accept a full http(s) URL, or a host/path such as `instagram.com/tcghk`
 * (https is added). Anything else — blank, `javascript:`, missing host — is hidden.
 */
export function resolveSocialHref(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

/**
 * Static `process.env.NAME` reads so Next.js exposes these on the server.
 * When adding a slot, add its env var here as well.
 */
const SOCIAL_ENV: Record<string, string | undefined> = {
  SOCIAL_INSTAGRAM_URL: process.env.SOCIAL_INSTAGRAM_URL,
  SOCIAL_FACEBOOK_URL: process.env.SOCIAL_FACEBOOK_URL,
};

function readSlotEnv(
  slot: SocialLinkSlot,
  env: Record<string, string | null | undefined> | undefined,
): string | undefined {
  if (env) {
    if (!slot.envVar || !(slot.envVar in env)) return undefined;
    return env[slot.envVar] ?? undefined;
  }
  if (!slot.envVar) return undefined;
  if (slot.envVar in SOCIAL_ENV) return SOCIAL_ENV[slot.envVar];
  return process.env[slot.envVar];
}

/**
 * Slots with an empty or invalid URL are omitted.
 * An explicit env value wins over the slot `href`, including an empty string that hides a coded URL.
 * WhatsApp is appended only when `whatsappHref` (or `WHATSAPP_NUMBER` / `STORE.whatsapp`) resolves.
 */
export function resolveSocialLinks(
  options: {
    env?: Record<string, string | null | undefined>;
    slots?: readonly SocialLinkSlot[];
    whatsappHref?: string | null;
  } = {},
): ResolvedSocialLink[] {
  const slots = options.slots ?? SOCIAL_LINK_SLOTS;
  const links: ResolvedSocialLink[] = [];

  for (const slot of slots) {
    const fromEnv = readSlotEnv(slot, options.env);
    const raw = fromEnv !== undefined ? fromEnv : slot.href;
    const href = resolveSocialHref(raw);
    if (!href) continue;
    links.push({
      id: slot.id,
      label: slot.label,
      accessibleName: slot.accessibleName,
      href,
      icon: slot.icon,
    });
  }

  const whatsappHref =
    options.whatsappHref !== undefined ? options.whatsappHref : resolveWhatsAppHref();
  if (whatsappHref) {
    links.push({ ...WHATSAPP_SLOT, href: whatsappHref });
  }

  return links;
}
