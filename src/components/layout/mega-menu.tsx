"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
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

export function MegaMenu({ open, onClose }: MegaMenuProps) {
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
      className="absolute left-0 right-0 top-full z-40 border-t border-border bg-background/95 backdrop-blur-sm"
      onMouseLeave={onClose}
    >
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-6">
        <div className="w-64 shrink-0 space-y-1">
          {PRODUCT_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              {"children" in cat ? (
                <>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat.label}
                  </p>
                  {cat.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="group flex items-center justify-between rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={onClose}
                    >
                      {child.label}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    </Link>
                  ))}
                </>
              ) : (
                <Link
                  href={cat.href}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={onClose}
                >
                  {cat.label}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
        <div className="relative hidden min-h-56 flex-1 overflow-hidden rounded-lg border border-border bg-muted/30 md:block">
          {banner?.image ? (
            <div className="relative block h-full min-h-56">
              <Image
                src={banner.image}
                alt={banner.title || "商品選單"}
                fill
                className="object-cover"
                sizes="720px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-full min-h-56 items-center justify-center p-8">
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
