"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Tags,
  Trophy,
  FilePenLine,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "總覽", icon: LayoutDashboard, exact: true },
  { href: "/admin/taxonomy", label: "標籤管理", icon: Tags },
  { href: "/admin/products", label: "商品上架", icon: Package },
  { href: "/admin/content", label: "網站內容", icon: FilePenLine },
  { href: "/admin/orders", label: "交易紀錄", icon: Receipt },
  { href: "/admin/tournaments", label: "店賽報名", icon: Trophy },
];

/** Sidebar content — shared between desktop sidebar and mobile drawer. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const logout = () => signOut({ callbackUrl: "/login" });

  return (
    <>
      <nav className="flex-1 space-y-0.5 p-3">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
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
    </>
  );
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Mobile top bar (visible only on small screens) ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-pink-400">商家後台</p>
          <span className="text-sm font-semibold text-foreground">
            {SITE_BRAND}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="打開選單"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="text-xs font-semibold text-pink-400">商家後台</p>
            <p className="text-sm font-semibold text-foreground">
              {SITE_BRAND}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="關閉選單"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border p-4">
          <p className="text-xs font-semibold text-pink-400">商家後台</p>
          <p className="text-sm font-semibold text-foreground">{SITE_BRAND}</p>
        </div>
        <SidebarContent />
      </aside>
    </>
  );
}
