import { DEMO_TOURNAMENTS } from "@/lib/demo-products";

/**
 * Weekly demo events inserted by `npm run db:seed-tournaments`.
 * These are not the Kowloon Bay store schedule. Kept in sync with DEMO_TOURNAMENTS
 * so a new demo seed slug is covered by the same production guard.
 */
export const DEMO_TOURNAMENT_SLUGS: readonly string[] = DEMO_TOURNAMENTS.map(
  (tournament) => tournament.slug,
);

/** Live storefront. Preview deployment hosts are not this name. */
export const LIVE_STOREFRONT_HOST = "tcg-website-xi.vercel.app";

/** Casual values such as `true` or `1` do not pass. */
export const PRODUCTION_DEMO_SEED_OVERRIDE_ENV = "ALLOW_PRODUCTION_DEMO_TOURNAMENT_SEED";
export const PRODUCTION_DEMO_SEED_OVERRIDE_VALUE =
  "I_UNDERSTAND_THIS_WRITES_DEMO_TOURNAMENTS_TO_PRODUCTION";

const APP_URL_ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "APP_URL", "AUTH_URL", "NEXTAUTH_URL"] as const;

export type RuntimeEnv = Record<string, string | undefined>;

function normalizeHost(hostname: string): string {
  return hostname.replace(/\.$/, "").replace(/^\[|\]$/g, "").toLowerCase();
}

function isLocalHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host === "host.docker.internal" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

/** Hostname of an app URL, or null when the value is empty or not a URL. */
export function hostnameFromAppUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const hostname = normalizeHost(new URL(candidate).hostname);
    return hostname || null;
  } catch {
    return null;
  }
}

function isProductionStorefrontHost(hostname: string, env: RuntimeEnv): boolean {
  const host = normalizeHost(hostname);
  if (!host || isLocalHost(host)) return false;
  if (host === LIVE_STOREFRONT_HOST || host === `www.${LIVE_STOREFRONT_HOST}`) return true;
  const declared = hostnameFromAppUrl(env.VERCEL_PROJECT_PRODUCTION_URL);
  return Boolean(declared && !isLocalHost(declared) && host === declared);
}

/**
 * Why the public storefront should hide the weekly demo slugs.
 * Reads environment variables only. Does not open a database connection.
 * `NODE_ENV=production` alone is not enough: local `next start` and Vercel preview both set it.
 */
export function storefrontDemoTournamentReasons(env: RuntimeEnv = process.env): string[] {
  const reasons: string[] = [];
  if (env.VERCEL_ENV === "production") reasons.push("VERCEL_ENV=production");
  if (env.NEXT_PUBLIC_VERCEL_ENV === "production") reasons.push("NEXT_PUBLIC_VERCEL_ENV=production");

  for (const key of APP_URL_ENV_KEYS) {
    const host = hostnameFromAppUrl(env[key]);
    if (host && isProductionStorefrontHost(host, env)) {
      reasons.push(`${key} 指向正式網站 ${host}`);
    }
  }

  if (env.STRIPE_SECRET_KEY?.trim().startsWith("sk_live_")) {
    reasons.push("STRIPE_SECRET_KEY 是正式金鑰");
  }
  if (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim().startsWith("pk_live_")) {
    reasons.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 是正式公開金鑰");
  }

  return reasons;
}

function databaseHost(databaseUrl: string | undefined): string | null {
  const raw = databaseUrl?.trim();
  if (!raw) return null;
  try {
    const hostname = normalizeHost(new URL(raw).hostname);
    return hostname || null;
  } catch {
    return null;
  }
}

/**
 * Extra seed blocks for a production process pointed at a remote database.
 * The storefront filter does not use this: local `next start` against a dev database
 * should still show seeded rows. The hostname is never paired with credentials.
 */
function remoteProductionSeedReasons(env: RuntimeEnv): string[] {
  if (env.NODE_ENV !== "production") return [];
  const raw = env.DATABASE_URL?.trim();
  if (!raw) return [];
  const host = databaseHost(raw);
  if (host === null) {
    return ["NODE_ENV=production 且 DATABASE_URL 不是可確認的本機資料庫"];
  }
  if (isLocalHost(host)) return [];
  return [`NODE_ENV=production 且 DATABASE_URL 指向遠端主機 ${host}`];
}

export function demoTournamentSeedBlockReasons(env: RuntimeEnv = process.env): string[] {
  return [...storefrontDemoTournamentReasons(env), ...remoteProductionSeedReasons(env)];
}

export function demoTournamentSeedRefusal(env: RuntimeEnv = process.env): string | null {
  const reasons = demoTournamentSeedBlockReasons(env);
  if (reasons.length === 0) return null;
  const override = env[PRODUCTION_DEMO_SEED_OVERRIDE_ENV]?.trim();
  if (override === PRODUCTION_DEMO_SEED_OVERRIDE_VALUE) return null;
  return (
    `拒絕寫入示範店賽：偵測到正式環境（${reasons.join("、")}）。` +
    "standard-sat-12 與 beginner-friendly 只供本機與開發種子，不能寫進正式資料庫。" +
    `若確實要覆寫，請設定 ${PRODUCTION_DEMO_SEED_OVERRIDE_ENV}=${PRODUCTION_DEMO_SEED_OVERRIDE_VALUE}。`
  );
}

/** Throws before any database client is constructed. The override does not show the rows on the storefront. */
export function assertDemoTournamentSeedAllowed(env: RuntimeEnv = process.env): void {
  const refusal = demoTournamentSeedRefusal(env);
  if (refusal) throw new Error(refusal);
}

/** Drop weekly demo slugs on the production storefront. Other slugs, including admin-created events, stay. */
export function omitProductionDemoTournaments<T extends { slug: string }>(
  items: T[],
  env: RuntimeEnv = process.env,
): T[] {
  if (storefrontDemoTournamentReasons(env).length === 0) return items;
  const hidden = new Set<string>(DEMO_TOURNAMENT_SLUGS);
  return items.filter((item) => !hidden.has(item.slug));
}
