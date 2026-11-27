"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { SiteSearchBar, SiteSearchToggle } from "@/components/layout/site-search";
import { LocaleCurrencyMenu } from "@/components/layout/locale-currency-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, SITE_BRAND, STORE } from "@/lib/constants";
import { getStoreMapsUrl } from "@/lib/store-maps";
import { useCart } from "@/providers/cart-provider";

const iconButton =
  "inline-flex items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]";

export function MerchantHeader() {
  const { data: session } = useSession();
  const { itemCount } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const storeMapsUrl = getStoreMapsUrl();
  const cartLabel = itemCount > 0 ? `購物車，${itemCount} 件商品` : "購物車";
  const roleLabel = session?.user?.role === "ADMIN" ? "商家管理員" : "商家帳戶";

  return (
    <header className="sticky top-0 z-40 bg-trtcg-header text-white">
      <div className="mx-auto flex h-24 w-full max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 xl:px-0">
        <Link href="/" className="text-[28px] font-bold leading-[1.4] text-white">
          {SITE_BRAND}
        </Link>
        <div className="flex items-center gap-3 text-white sm:gap-6">
          <p className="hidden text-[14px] font-bold leading-[1.45] lg:block">{roleLabel}</p>
          <Link href="/admin" className="hidden text-[14px] font-bold leading-[1.45] lg:inline">
            後台
          </Link>
          <Button
            type="button"
            variant="quiet"
            className="h-12 min-w-[72px] px-4 text-white"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            登出
          </Button>
          <LocaleCurrencyMenu tone="onDark" />
          <a
            href={storeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${iconButton} hidden md:inline-flex`}
            aria-label={`開啟門市地圖：${STORE.address.zh}`}
            title={STORE.address.zh}
          >
            <Image src="/brand/home/icon-pin.svg" alt="" width={22} height={22} unoptimized />
          </a>
          <ThemeToggle appearance="ink" />
          <SiteSearchToggle
            appearance="ink"
            expanded={searchOpen}
            onToggle={() => setSearchOpen((open) => !open)}
          />
          <Link href="/cart" className={`${iconButton} relative`} aria-label={cartLabel}>
            <Image src="/brand/home/icon-bag.svg" alt="" width={22} height={22} unoptimized />
            {itemCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-trtcg-gold px-1 text-[10px] font-medium text-trtcg-header"
              >
                {itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
      <SiteSearchBar expanded={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="h-px bg-[rgba(200,162,74,0.55)]" />
    </header>
  );
}

export function MerchantShopNav() {
  return (
    <nav aria-label="商店" className="flex flex-wrap gap-x-8 gap-y-3 py-5">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-[14px] font-bold leading-[1.45] text-trtcg-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
