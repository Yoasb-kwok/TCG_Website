"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DEMO_ADMIN_LINKS, DEMO_OWNER, DEMO_SHOP, DEMO_STORE_PATH } from "@/lib/demo-shop";
import { cn } from "@/lib/utils";

export function DemoAdminSidebar() {
  const pathname = usePathname();
  const onPos = pathname === "/pos/demo" || pathname.startsWith("/pos/demo/");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="text-xs font-semibold text-pink-400">示範後台</p>
        <p className="text-sm font-semibold text-foreground">{DEMO_SHOP.name}</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-3" aria-label="示範後台選單">
        {DEMO_ADMIN_LINKS.map((link) => {
          const exact = "exact" in link && link.exact;
          const active = exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/pos/demo"
          className={cn(
            "mt-2 block rounded-md border px-3 py-2 text-center text-sm font-medium transition",
            onPos && pathname === "/pos/demo"
              ? "border-pink-500 bg-pink-500 text-white"
              : "border-border text-muted-foreground hover:border-pink-400 hover:text-foreground",
          )}
        >
          收銀帳務
        </Link>
      </nav>
      <div className="space-y-1 border-t border-border p-3">
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">已登入示範</p>
          <p className="text-sm font-semibold text-foreground">{DEMO_OWNER.name}</p>
          <p className="text-xs text-muted-foreground">
            {DEMO_OWNER.title} · {DEMO_SHOP.name}
          </p>
        </div>
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">主題</span>
          <ThemeToggle />
        </div>
        <Link
          href={DEMO_STORE_PATH}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          查看示範網店
        </Link>
      </div>
    </aside>
  );
}
