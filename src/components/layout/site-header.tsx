"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
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

  const iconButton =
    "inline-flex items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]";

  return (
    <header className="sticky top-0 z-50 bg-[#080808] text-white">
      <div className="mx-auto flex h-[88px] w-full max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 xl:px-0">
        <Link href="/" className="flex w-[190px] shrink-0 items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#c8a24a] text-[13px] leading-[1.6] text-[#080808]">
            TCG
          </span>
          <span className="text-[20px] font-medium leading-[1.45] text-white">{SITE_BRAND}</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-7 xl:flex" aria-label="商店">
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
                  className="inline-flex items-center rounded-md text-[14px] font-medium leading-[1.45] text-white transition hover:text-[#c8a24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
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
                className="text-[14px] font-medium leading-[1.45] whitespace-nowrap text-white transition hover:text-[#c8a24a]"
                onMouseEnter={scheduleClose}
                onClick={() => setMegaOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-3 text-white sm:gap-[22px]">
          <UserMenu tone="onDark" />
          <LocaleCurrencyMenu tone="onDark" />
          <a
            href={storeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(iconButton, "hidden md:inline-flex")}
            aria-label={`開啟門市地圖：${STORE.address.zh}`}
            title={STORE.address.zh}
          >
            <Image src="/brand/home/icon-pin.svg" alt="" width={22} height={22} unoptimized />
          </a>
          <ThemeToggle appearance="ink" />
          <SiteSearchToggle
            appearance="ink"
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
            className={cn(iconButton, "relative")}
            onClick={() => setIsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={cartOpen}
            aria-label={cartLabel}
          >
            <Image src="/brand/home/icon-bag.svg" alt="" width={22} height={22} unoptimized />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c8a24a] px-1 text-[10px] font-medium text-[#080808]"
              >
                {itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={cn(iconButton, "xl:hidden")}
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

      {mobileOpen && (
        <div className="border-t border-[#c8a24a]/40 bg-[#080808] px-4 py-4 text-white xl:hidden">
          {session?.user ? (
            <>
              <p className="mb-2 truncate py-2 text-sm text-white">
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
                className="mb-2 flex w-full items-center gap-2 py-2 text-sm text-white/80 hover:text-white"
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
              className="mb-2 flex items-center gap-2 py-2 text-sm text-white/80 hover:text-white"
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
                  className="flex w-full items-center justify-between py-2 text-sm text-white/80 hover:text-white"
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
                  <div
                    className="border-l border-white/15 pb-2 pl-3 text-[#0a0a09]"
                    style={{
                      ["--foreground" as string]: "#0a0a09",
                      ["--muted-foreground" as string]: "#625f58",
                      ["--muted" as string]: "#ece7dc",
                      ["--background" as string]: "#f7f5ef",
                    }}
                  >
                    <Link
                      href={POKEMON_TCG_CATEGORY.href}
                      className="block rounded bg-[#f7f5ef] px-2 py-2 text-sm font-medium text-[#0a0a09] hover:bg-[#ece7dc]"
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
                className="block py-2 text-sm text-white/80 hover:text-white"
                onClick={closeMenus}
              >
                {item.label}
              </Link>
            ),
          )}
          {socialLinks.length > 0 && (
            <div className="mt-3 border-t border-white/15 pt-3">
              <p className="mb-1 text-xs font-semibold text-white">社交媒體</p>
              <SocialLinks links={socialLinks} variant="header" />
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-[rgba(200,162,74,0.55)]" />
      <CartSheet />
    </header>
  );
}
