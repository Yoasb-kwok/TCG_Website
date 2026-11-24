"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { POKEMON_TCG_CATEGORY } from "@/lib/storefront-categories";

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

interface MenuBanner {
  image: string;
  href: string;
  title: string;
}

const DEMO_BANNER: MenuBanner = {
  image: "/banners/menu-demo.jpg",
  href: "/products",
  title: "商品選單",
};

export function MegaMenu({ open, onClose, onPointerEnter, onPointerLeave }: MegaMenuProps) {
  const [banner, setBanner] = useState<MenuBanner | null>(DEMO_BANNER);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/menu-banner")
      .then((res) => res.json())
      .then((data: { banner?: MenuBanner | null }) => {
        if (!cancelled) setBanner(data.banner ?? null);
      })
      .catch(() => {
        if (!cancelled) setBanner(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  return (
    <div
      id="storefront-mega"
      className="absolute top-full right-0 left-0 z-40 border-t border-trtcg-gold/55 bg-[#f7f5ef] text-trtcg-ink shadow-trtcg-card"
      style={{
        ["--foreground" as string]: "#0a0a09",
        ["--muted-foreground" as string]: "#625f58",
        ["--muted" as string]: "#ece7dc",
        ["--border" as string]: "rgba(221,213,195,0.9)",
        ["--background" as string]: "#f7f5ef",
      }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <div className="mx-auto flex max-w-[1280px] gap-8 px-4 py-6 sm:px-6 xl:px-0">
        <div className="w-52 shrink-0">
          <p className="mb-2 px-2 text-xs font-semibold tracking-wider text-muted-foreground">遊戲</p>
          <Link
            id="storefront-game-link"
            href={POKEMON_TCG_CATEGORY.href}
            className="flex items-center rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-trtcg-paper"
            onClick={onClose}
          >
            {POKEMON_TCG_CATEGORY.label}
          </Link>
        </div>
        <div className="relative hidden min-h-[26rem] flex-1 overflow-hidden rounded-lg border border-border bg-muted/30 md:block">
          {banner?.image ? (
            <div className="relative block h-full min-h-[26rem]">
              <Image
                src={banner.image}
                alt={banner.title || "商品選單"}
                fill
                className="object-cover"
                sizes="1040px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[26rem] items-center justify-center p-8">
              <p className="text-center text-sm text-muted-foreground">
                瀏覽 Pokémon TCG 單卡、封盒及配件
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
