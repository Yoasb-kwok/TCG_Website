"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { CartSheet } from "@/components/cart/cart-sheet";
import { DEMO_SHOP, DEMO_STORE_PATH } from "@/lib/demo-shop";
import { cn } from "@/lib/utils";
import { useCart } from "@/providers/cart-provider";

const LINKS = [
  { href: DEMO_STORE_PATH, label: "商品" },
  { href: `${DEMO_STORE_PATH}/tournaments`, label: "店賽" },
  { href: `${DEMO_STORE_PATH}/about`, label: "關於示範店" },
];

export function DemoStoreHeader() {
  const pathname = usePathname();
  const { itemCount, isOpen, setIsOpen } = useCart();
  const cartLabel = itemCount > 0 ? `購物車，${itemCount} 件商品` : "購物車";

  return (
    <header className="sticky top-14 z-30 border-b border-white/10 bg-[#070b14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link href={DEMO_STORE_PATH} className="min-w-0">
          <span className="block truncate text-sm font-bold tracking-tight text-white">{DEMO_SHOP.name}</span>
          <span className="hidden text-xs text-slate-400 sm:block">{DEMO_SHOP.address.zh}</span>
        </Link>
        <nav aria-label="示範網店" className="hidden items-center gap-5 text-sm md:flex">
          {LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== DEMO_STORE_PATH && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  active ? "font-semibold text-white" : "text-slate-400 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="relative rounded-full border border-white/10 bg-white/5 p-2 text-white hover:border-cyan-300/40 hover:bg-white/10"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={cartLabel}
        >
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          {itemCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-1 text-[10px] font-bold text-white"
            >
              {itemCount}
            </span>
          )}
        </button>
      </div>
      <nav aria-label="示範網店" className="flex gap-4 border-t border-white/10 px-4 py-2 text-sm md:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-slate-400 hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
      <CartSheet demo />
    </header>
  );
}
