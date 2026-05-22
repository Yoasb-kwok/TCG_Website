import Link from "next/link";
import { SHOW_STORE_ADDRESS, SITE_BRAND, STORE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background py-12 text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <p className="font-semibold text-foreground">{SITE_BRAND}</p>
          <p className="mt-2 text-sm">香港 Pokémon TCG 專門店 · 單卡買賣 · 店賽舉辦</p>
          {SHOW_STORE_ADDRESS && (
            <p className="mt-3 text-sm">{STORE.address.zh}</p>
          )}
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">商店</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/products" className="hover:text-foreground">
                全部商品
              </Link>
            </li>
            <li>
              <Link href="/products?type=SINGLE" className="hover:text-foreground">
                單卡
              </Link>
            </li>
            <li>
              <Link href="/products?type=SEALED_BOX" className="hover:text-foreground">
                封盒
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">資訊</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-foreground">
                關於我們
              </Link>
            </li>
            <li>
              <Link href="/shipping" className="hover:text-foreground">
                送貨方式
              </Link>
            </li>
            <li>
              <Link href="/payment" className="hover:text-foreground">
                付款方式
              </Link>
            </li>
            <li>
              <Link href="/tournaments" className="hover:text-foreground">
                店賽日程
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">聯絡</p>
          <p className="text-sm">{STORE.hours}</p>
          {SHOW_STORE_ADDRESS && (
            <p className="mt-1 text-sm">{STORE.mtr}</p>
          )}
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-border px-4 pt-8 text-center text-xs lg:px-6">
        © {new Date().getFullYear()} {SITE_BRAND}. All rights reserved.
      </div>
    </footer>
  );
}
