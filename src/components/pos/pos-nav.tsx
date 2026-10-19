import Link from "next/link";
import { NAV_ITEMS, SITE_BRAND } from "@/lib/constants";
import { demoPosPath } from "@/lib/demo-paths";
import { DEMO_OWNER, DEMO_SHOP } from "@/lib/demo-shop";
import { POS_TABS, type PosTabId } from "@/lib/staff-nav";
import { cn } from "@/lib/utils";

export function PosShell({
  current,
  children,
  storefrontNav = false,
  demo = false,
}: {
  current: PosTabId;
  children: React.ReactNode;
  /** 收卡沿用網店導覽：商品、最新預訂、店賽、關於我們、送貨、付款。 */
  storefrontNav?: boolean;
  /** Public demo register. Tabs stay under /pos/demo and skip auth. */
  demo?: boolean;
}) {
  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center rounded-full px-4 text-sm font-bold",
      active ? "bg-pink-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-background text-foreground",
        demo ? "h-full" : "h-dvh",
      )}
      style={{ fontFamily: "var(--font-pos), var(--font-sans), sans-serif" }}
    >
      <header className="shrink-0 border-b border-border bg-background">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href={demo ? "/admin/demo" : "/admin"}
            className="rounded-full bg-muted px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted/80"
          >
            ← 商家後台
          </Link>
          <div className="flex items-center gap-2 leading-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-bold text-white">
              TCG
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">{demo ? DEMO_SHOP.name : SITE_BRAND}</p>
              <p className="text-[11px] text-muted-foreground">
                {demo ? `${DEMO_OWNER.name} · 收銀` : "收銀"}
              </p>
            </div>
          </div>
          <nav className="flex gap-1" aria-label="收銀">
            {POS_TABS.map((item) => (
              <Link
                key={item.id}
                href={demo ? demoPosPath(item.href) : item.href}
                className={tabClass(current === item.id)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {storefrontNav && (
          <nav aria-label="網店導覽" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
