"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ChevronDown,
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
import { PokemonCategoryLinks } from "@/components/layout/pokemon-category-links";
import { UserMenu } from "@/components/layout/user-menu";
import { CartSheet } from "@/components/cart/cart-sheet";
import { SocialLinks } from "@/components/layout/social-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart } from "@/providers/cart-provider";
import { NAV_ITEMS, SITE_BRAND, STORE } from "@/lib/constants";
import type { ResolvedSocialLink } from "@/lib/social";
import { POKEMON_TCG_CATEGORY, type StorefrontCategoryLink } from "@/lib/storefront-categories";
import { getStoreMapsUrl } from "@/lib/store-maps";
import { cn } from "@/lib/utils";

export function SiteHeader({
  socialLinks,
  pokemonCategories,
}: {
  socialLinks: ResolvedSocialLink[];
  pokemonCategories: StorefrontCategoryLink[];
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { itemCount, isOpen: cartOpen, setIsOpen } = useCart();
  const storeMapsUrl = getStoreMapsUrl();
  const cartLabel = itemCount > 0 ? `購物車，${itemCount} 件商品` : "購物車";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const isAdmin = session?.user?.role === "ADMIN";
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMegaOpen(false);
    setMobileOpen(false);
    setProductsOpen(false);
  }
  const categoryAnchorRef = useRef<HTMLDivElement>(null);
  const productsButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusCategoryMenu = useRef(false);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setMegaOpen(false), 150);
  }

  function closeMenus() {
    setMegaOpen(false);
    setMobileOpen(false);
    setProductsOpen(false);
  }

  useEffect(() => {
    if (!megaOpen || !focusCategoryMenu.current) return;
    focusCategoryMenu.current = false;
    document.querySelector<HTMLAnchorElement>("#storefront-l2-menu a")?.focus();
  }, [megaOpen]);

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!megaOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMegaOpen(false);
      productsButtonRef.current?.focus();
    }
    function onPointer(event: MouseEvent) {
      if (!categoryAnchorRef.current?.contains(event.target as Node)) {
        setMegaOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [megaOpen]);

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
            aria-label={`開啟門市地圖：${STORE.address.zh}`}
            title={STORE.address.zh}
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
                setProductsOpen(false);
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
            onClick={() => {
              setMobileOpen((open) => {
                if (open) setProductsOpen(false);
                return !open;
              });
            }}
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

      <nav className="hidden border-t border-border lg:block" aria-label="商店">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-2">
          <div className="flex gap-6">
            {NAV_ITEMS.map((item) =>
              item.hasMegaMenu ? (
                <div
                  key={item.href}
                  ref={categoryAnchorRef}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    ref={productsButtonRef}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      megaOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-expanded={megaOpen}
                    aria-controls="storefront-l2-menu"
                    aria-haspopup="true"
                    onMouseEnter={() => {
                      cancelClose();
                      setMegaOpen(true);
                    }}
                    onClick={() => {
                      cancelClose();
                      setMegaOpen((open) => !open);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowDown") return;
                      event.preventDefault();
                      focusCategoryMenu.current = true;
                      setMegaOpen(true);
                    }}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition", megaOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                  <MegaMenu
                    open={megaOpen}
                    links={pokemonCategories}
                    onClose={() => setMegaOpen(false)}
                    onPointerEnter={cancelClose}
                    onPointerLeave={scheduleClose}
                  />
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                  onMouseEnter={scheduleClose}
                  onClick={() => setMegaOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>
          <SocialLinks links={socialLinks} variant="header" />
        </div>
      </nav>

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
                  onClick={closeMenus}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  商家後台
                </Link>
              )}
              <button
                type="button"
                className="mb-2 flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  closeMenus();
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
              onClick={closeMenus}
            >
              <User className="h-4 w-4" />
              登入 / 註冊
            </Link>
          )}
          {NAV_ITEMS.map((item) =>
            item.hasMegaMenu ? (
              <div key={item.href}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground"
                  aria-expanded={productsOpen}
                  aria-controls="storefront-l2-menu-mobile"
                  onClick={() => setProductsOpen((open) => !open)}
                >
                  {item.label}
                  <ChevronDown
                    className={cn("h-4 w-4 transition", productsOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
                {productsOpen && (
                  <div className="border-l border-border pb-2 pl-3">
                    <Link
                      href={POKEMON_TCG_CATEGORY.href}
                      className="block rounded px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
                      onClick={closeMenus}
                    >
                      {POKEMON_TCG_CATEGORY.label}
                    </Link>
                    <PokemonCategoryLinks
                      id="storefront-l2-menu-mobile"
                      links={pokemonCategories}
                      onNavigate={closeMenus}
                      variant="mobile"
                    />
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={closeMenus}
              >
                {item.label}
              </Link>
            ),
          )}
          {socialLinks.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1 text-xs font-semibold text-foreground">社交媒體</p>
              <SocialLinks links={socialLinks} variant="header" />
            </div>
          )}
        </div>
      )}

      <CartSheet />
    </header>
  );
}
