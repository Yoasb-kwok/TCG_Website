"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
import { UserMenu } from "@/components/layout/user-menu";
import { CartSheet } from "@/components/cart/cart-sheet";
import { SocialLinks } from "@/components/layout/social-links";
import { storefrontIconButton } from "@/components/home/home-layout";
import { useCart } from "@/providers/cart-provider";
import { NAV_ITEMS, SITE_BRAND } from "@/lib/constants";
import type { ResolvedSocialLink } from "@/lib/social";
import { POKEMON_TCG_CATEGORY } from "@/lib/storefront-categories";
import { cn } from "@/lib/utils";

export function SiteHeader({ socialLinks }: { socialLinks: ResolvedSocialLink[] }) {
  return (
    <Suspense fallback={<SiteHeaderView socialLinks={socialLinks} preorder={false} />}>
      <SiteHeaderQuery socialLinks={socialLinks} />
    </Suspense>
  );
}

function SiteHeaderQuery({ socialLinks }: { socialLinks: ResolvedSocialLink[] }) {
  const searchParams = useSearchParams();
  return (
    <SiteHeaderView
      socialLinks={socialLinks}
      preorder={searchParams.get("type") === "SEALED_BOX"}
    />
  );
}

function SiteHeaderView({
  socialLinks,
  preorder,
}: {
  socialLinks: ResolvedSocialLink[];
  preorder: boolean;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const preorderCurrent = preorder && pathname === "/products";
  const { itemCount } = useCart();
  const cartLabel = itemCount > 0 ? `購物車，${itemCount} 件商品` : "購物車";
  const instagram = socialLinks.find((link) => link.id === "instagram") ?? null;
  const whatsapp = socialLinks.find((link) => link.id === "whatsapp") ?? null;
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
    document.querySelector<HTMLAnchorElement>("#storefront-game-link")?.focus();
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

  const iconButton = storefrontIconButton;

  return (
    <header className="sticky top-0 z-50 bg-trtcg-header text-white">
      <div className="mx-auto flex h-[88px] w-full max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 xl:px-0">
        <Link href="/" className="flex w-[190px] shrink-0 items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-trtcg-gold text-[13px] leading-[1.6] text-trtcg-header">
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
                  className="inline-flex items-center rounded-md text-[14px] font-medium leading-[1.45] text-white transition hover:text-trtcg-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trtcg-gold"
                  aria-expanded={megaOpen}
                  aria-controls="storefront-mega"
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
                  onClose={() => setMegaOpen(false)}
                  onPointerEnter={cancelClose}
                  onPointerLeave={scheduleClose}
                />
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-[14px] font-medium leading-[1.45] whitespace-nowrap transition hover:text-trtcg-gold",
                  preorderCurrent && item.href === "/products?type=SEALED_BOX"
                    ? "text-trtcg-gold"
                    : "text-white",
                )}
                aria-current={
                  preorderCurrent && item.href === "/products?type=SEALED_BOX" ? "page" : undefined
                }
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
          <HeaderSocialIcon
            href={instagram?.href ?? null}
            label={instagram?.accessibleName ?? "Instagram"}
            className={iconButton}
          >
            <InstagramGlyph />
          </HeaderSocialIcon>
          <HeaderSocialIcon
            href={whatsapp?.href ?? null}
            label={whatsapp?.accessibleName ?? "WhatsApp 聯絡"}
            className={iconButton}
          >
            <WhatsAppGlyph />
          </HeaderSocialIcon>
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
          <Link
            href="/cart"
            className={cn(iconButton, "relative")}
            aria-label={cartLabel}
            aria-current={pathname === "/cart" ? "page" : undefined}
          >
            <Image src="/brand/home/icon-bag.svg" alt="" width={22} height={22} unoptimized />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-trtcg-gold px-1 text-[10px] font-medium text-trtcg-header"
              >
                {itemCount}
              </span>
            )}
          </Link>
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
                  className="flex w-full items-center justify-between py-2 text-sm text-white/80 transition hover:text-trtcg-gold"
                  aria-expanded={productsOpen}
                  aria-controls="storefront-game-link-mobile"
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
                      id="storefront-game-link-mobile"
                      href={POKEMON_TCG_CATEGORY.href}
                      className="block rounded bg-[#f7f5ef] px-2 py-2 text-sm font-medium text-[#0a0a09] transition hover:bg-trtcg-paper"
                      onClick={closeMenus}
                    >
                      {POKEMON_TCG_CATEGORY.label}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block py-2 text-sm transition hover:text-trtcg-gold",
                  preorderCurrent && item.href === "/products?type=SEALED_BOX"
                    ? "text-trtcg-gold"
                    : "text-white/80",
                )}
                aria-current={
                  preorderCurrent && item.href === "/products?type=SEALED_BOX" ? "page" : undefined
                }
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

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 xl:px-0">
        <div className="h-px bg-trtcg-gold/55" />
      </div>
      <CartSheet />
    </header>
  );
}

function HeaderSocialIcon({
  href,
  label,
  className,
  children,
}: {
  href: string | null;
  label: string;
  className: string;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <a href="#" aria-label={label} className={className} onClick={(event) => event.preventDefault()}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={className}>
      {children}
    </a>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" fill="none">
      <rect x="3.2" y="3.2" width="15.6" height="15.6" rx="4.4" stroke="currentColor" strokeWidth="1.375" />
      <circle cx="11" cy="11" r="3.6" stroke="currentColor" strokeWidth="1.375" />
      <circle cx="16.1" cy="5.9" r="0.8" fill="currentColor" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 25 25" width="22" height="22" aria-hidden="true" fill="none">
      <path
        d="M21.3542 12.2917C21.356 13.8417 20.9509 15.3651 20.1794 16.7094C19.4078 18.0538 18.2969 19.1721 16.9576 19.9525C15.6183 20.7328 14.0977 21.1479 12.5477 21.1563C10.9976 21.1646 9.4726 20.7659 8.125 20L3.125 21.3542L4.47917 16.4583C3.92941 15.2734 3.64864 13.9816 3.65696 12.6754C3.66529 11.3692 3.96251 10.081 4.52733 8.90326C5.09214 7.72547 5.91055 6.68724 6.92388 5.86301C7.9372 5.03877 9.12035 4.44895 10.3885 4.13583C11.6566 3.82271 12.9783 3.79405 14.2588 4.05191C15.5393 4.30976 16.7469 4.84775 17.795 5.62728C18.8431 6.40682 19.7058 7.4086 20.3211 8.5608C20.9364 9.71299 21.2892 10.9871 21.3542 12.2917Z"
        stroke="currentColor"
        strokeWidth="1.5625"
        strokeLinejoin="round"
      />
      <path
        d="M8.4375 7.70833L10 7.29167L11.1458 9.6875L10.2083 10.8333C10.9339 11.9612 11.893 12.9203 13.0208 13.6458L14.1667 12.7083L16.5625 13.8542L16.1458 15.4167C15.8333 16.7708 14.0625 16.7708 12.2917 15.8333C10.4981 14.7887 9.02192 13.2766 8.02083 11.4583C7.08333 9.6875 7.08333 8.02083 8.4375 7.70833Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
