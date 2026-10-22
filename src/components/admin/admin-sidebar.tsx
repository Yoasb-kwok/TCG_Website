"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Library,
  FileSpreadsheet,
  Package,
  Tags,
  Trophy,
  FilePenLine,
  Users,
  LogOut,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_BRAND } from "@/lib/constants";
import { CASHIER_SIDEBAR_LINKS, MERCHANT_SIDEBAR_LINKS } from "@/lib/staff-nav";
import { cn } from "@/lib/utils";

const ICONS: Record<(typeof MERCHANT_SIDEBAR_LINKS)[number]["href"], LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/taxonomy": Tags,
  "/admin/catalog": Library,
  "/admin/data": FileSpreadsheet,
  "/admin/accounts": Users,
  "/admin/content": FilePenLine,
  "/admin/tournaments": Trophy,
};

export function AdminSidebar() {
  const pathname = usePathname();
  const logout = () => signOut({ callbackUrl: "/login" });
  const onPos = pathname === "/pos" || pathname.startsWith("/pos/");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="text-xs font-semibold text-pink-400">商家後台</p>
        <p className="text-sm font-semibold text-foreground">{SITE_BRAND}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="商家選單">
        {MERCHANT_SIDEBAR_LINKS.map((link) => {
          const Icon = ICONS[link.href];
          const exact = "exact" in link && link.exact;
          const active = exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        <div className="mt-2 space-y-0.5">
          <Link
            href="/pos"
            className={cn(
              "block rounded-md border px-3 py-2 text-center text-sm font-medium transition",
              onPos
                ? "border-pink-500 bg-pink-500 text-white"
                : "border-border text-muted-foreground hover:border-pink-400 hover:text-foreground",
            )}
          >
            收銀帳務
          </Link>
          <ul aria-label="收銀帳務" className="space-y-0.5 border-l border-border pl-2">
            {CASHIER_SIDEBAR_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Package className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">主題</span>
          <ThemeToggle />
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          查看網店
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>
    </aside>
  );
}
