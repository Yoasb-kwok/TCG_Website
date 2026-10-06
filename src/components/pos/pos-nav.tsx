import Link from "next/link";
import { SITE_BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PosShell({
  current,
  children,
}: {
  current: "register" | "receiving" | "pnl" | "orders";
  children: React.ReactNode;
}) {
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center rounded-full px-4 text-sm font-bold",
        active ? "bg-pink-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div
      className="flex h-dvh min-h-0 flex-col bg-background text-foreground"
      style={{ fontFamily: "var(--font-pos), var(--font-sans), sans-serif" }}
    >
      <header className="shrink-0 border-b border-border bg-background">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/admin" className="rounded-full bg-muted px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted/80">
            ← 商家後台
          </Link>
          <div className="flex items-center gap-2 leading-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-bold text-white">
              TCG
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">{SITE_BRAND}</p>
              <p className="text-[11px] text-muted-foreground">收銀</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {tab("/pos", "收銀", current === "register")}
            {tab("/pos/receiving", "來貨", current === "receiving")}
            {tab("/pos/pnl", "損益表", current === "pnl")}
            {tab("/pos/orders", "交易紀錄", current === "orders")}
          </nav>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
