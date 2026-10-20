/** Product landing for TCG-Pro OS. Public, no shop chrome. */
export const DEMO_LANDING_PATH = "/demo";
/** No-login sample storefront. Moved off `/demo` so the landing can own that URL. */
export const DEMO_STORE_PATH = "/demo/shop";
export const DEMO_ADMIN_PATH = "/admin/demo";
export const DEMO_POS_PATH = "/pos/demo";

export const DEMO_POS_DESKS = ["receiving", "buyback", "pnl", "orders", "scoreboard"] as const;
export type DemoPosDeskId = (typeof DEMO_POS_DESKS)[number];

export type DemoSurface = "store" | "admin" | "pos";

/** Auth bypass is only the demo admin and demo POS trees. The landing and sample shop are already public. */
export function isDemoAuthBypassPath(pathname: string): boolean {
  return (
    pathname === DEMO_ADMIN_PATH ||
    pathname.startsWith(`${DEMO_ADMIN_PATH}/`) ||
    pathname === DEMO_POS_PATH ||
    pathname.startsWith(`${DEMO_POS_PATH}/`)
  );
}

export function isDemoStorePath(pathname: string): boolean {
  return pathname === DEMO_STORE_PATH || pathname.startsWith(`${DEMO_STORE_PATH}/`);
}

/** Routes that draw their own chrome instead of the live storefront header. POS is covered separately. */
export function isDemoShellPath(pathname: string): boolean {
  return (
    pathname === DEMO_LANDING_PATH ||
    pathname.startsWith(`${DEMO_LANDING_PATH}/`) ||
    pathname === DEMO_ADMIN_PATH ||
    pathname.startsWith(`${DEMO_ADMIN_PATH}/`)
  );
}

export function demoSurface(pathname: string): DemoSurface {
  if (pathname === DEMO_ADMIN_PATH || pathname.startsWith(`${DEMO_ADMIN_PATH}/`)) return "admin";
  if (pathname === DEMO_POS_PATH || pathname.startsWith(`${DEMO_POS_PATH}/`)) return "pos";
  return "store";
}

/** Map a real POS href onto the public demo prefix. `/pos` stays the sell screen. */
export function demoPosPath(href: string): string {
  if (href === "/pos") return DEMO_POS_PATH;
  if (href.startsWith("/pos/")) return `${DEMO_POS_PATH}/${href.slice("/pos/".length)}`;
  return href;
}

export function isDemoPosDesk(value: string): value is DemoPosDeskId {
  return (DEMO_POS_DESKS as readonly string[]).includes(value);
}
