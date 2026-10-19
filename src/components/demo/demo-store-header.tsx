"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { CartSheet } from "@/components/cart/cart-sheet";
import { DEMO_SHOP } from "@/lib/demo-shop";
import { cn } from "@/lib/utils";
import { useCart } from "@/providers/cart-provider";

const LINKS = [
  { href: "/demo", label: "商品" },
  { href: "/demo/tournaments", label: "店賽" },
  { href: "/demo/about", label: "關於示範店" },
];

export function DemoStoreHeader() {
  const pathname = usePathname();
  const { itemCount, isOpen, setIsOpen } = useCart();
  const cartLabel = itemCount > 0 ? `購物車，${itemCount} 件商品` : "購物車";

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link href="/demo" className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{DEMO_SHOP.name}</span>
          <span className="hidden text-xs text-muted-foreground sm:block">{DEMO_SHOP.address.zh}</span>
        </Link>
        <nav aria-label="示範網店" className="hidden items-center gap-4 text-sm md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/demo" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="relative rounded-md p-2 text-foreground hover:bg-muted"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
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
      </div>
      <nav aria-label="示範網店" className="flex gap-4 border-t border-border px-4 py-2 text-sm md:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <CartSheet demo />
    </header>
  );
}
