"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  ShoppingBag,
  User,
  Menu,
  X,
} from "lucide-react";
import { SiteSearchBar, SiteSearchToggle } from "@/components/layout/site-search";
import { LocaleCurrencyMenu } from "@/components/layout/locale-currency-menu";
import { MegaMenu } from "@/components/layout/mega-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { CartSheet } from "@/components/cart/cart-sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart } from "@/providers/cart-provider";
import { NAV_ITEMS, SITE_BRAND } from "@/lib/constants";
import { getStoreMapsUrl } from "@/lib/store-maps";

export function SiteHeader() {
  const { data: session } = useSession();
  const { itemCount, isOpen: cartOpen, setIsOpen } = useCart();
  const storeMapsUrl = getStoreMapsUrl();
  const cartLabel = itemCount > 0 ? `購物車，${itemCount} 件商品` : "購物車";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-bold text-white">
            TCG
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
            {SITE_BRAND}
          </span>
        </Link>

        <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
          <UserMenu />
          <LocaleCurrencyMenu />
          <a
            href={storeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-md p-2 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
            aria-label="開啟門市地圖"
            title="開啟門市地圖"
          >
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </a>
          <ThemeToggle />
          <SiteSearchToggle
            expanded={searchOpen}
            onToggle={() => {
              setSearchOpen((v) => !v);
              if (!searchOpen) {
                setMobileOpen(false);
                setMegaOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="relative rounded-md p-2 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={cartOpen}
            aria-label={cartLabel}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white"
              >
                {itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <SiteSearchBar
        expanded={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <nav className="hidden border-t border-border lg:block">
        <div className="mx-auto flex max-w-7xl gap-6 px-6 py-2">
          {NAV_ITEMS.map((item) =>
            item.hasMegaMenu ? (
              <button
                key={item.href}
                type="button"
                className="text-sm text-muted-foreground transition hover:text-foreground"
                onMouseEnter={() => setMegaOpen(true)}
              >
                {item.label} ▾
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      </nav>

      <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          {session?.user ? (
            <>
              <p className="mb-2 truncate py-2 text-sm text-foreground">
                {session.user.name ?? session.user.email}
              </p>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="mb-2 flex items-center gap-2 py-2 text-sm text-pink-400 hover:text-pink-300"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  商家後台
                </Link>
              )}
              <button
                type="button"
                className="mb-2 flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="mb-2 flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <User className="h-4 w-4" />
              登入 / 註冊
            </Link>
          )}
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <CartSheet />
    </header>
  );
}
