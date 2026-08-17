"use client";

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
  Database,
  Award,
  Gamepad2,
  Ticket,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "總覽", icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: "遊戲管理", icon: Gamepad2 },
  { href: "/admin/taxonomy", label: "標籤管理", icon: Tags },
  { href: "/admin/products", label: "商品上架", icon: Package },
  { href: "/admin/content", label: "網站內容", icon: FilePenLine },
  { href: "/admin/transactions", label: "交易管理", icon: Receipt },
  { href: "/admin/accounts", label: "帳戶管理", icon: Users },
  { href: "/admin/points", label: "積分管理", icon: Award },
  { href: "/admin/tournaments", label: "店賽報名", icon: Trophy },
  { href: "/admin/coupons", label: "優惠券", icon: Ticket },
  { href: "/admin/data", label: "資料備份", icon: Database },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const logout = () => signOut({ callbackUrl: "/login" });

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="text-xs font-semibold text-pink-400">商家後台</p>
        <p className="text-sm font-semibold text-foreground">{SITE_BRAND}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
          <Link
            key={href}
            href={href}
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
    </aside>
  );
}
