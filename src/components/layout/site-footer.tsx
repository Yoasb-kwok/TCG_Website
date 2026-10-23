import Link from "next/link";
import { SHOW_STORE_ADDRESS, SITE_BRAND, STORE } from "@/lib/constants";
import type { ResolvedSocialLink } from "@/lib/social";
import { getStoreMapsUrl } from "@/lib/store-maps";
import { cn } from "@/lib/utils";

const columnTitle = "text-[14px] font-medium leading-[1.45] text-white";
const columnLink = "text-[13px] leading-[1.6] text-white transition hover:text-[#c8a24a]";

export function SiteFooter({
  socialLinks,
  inset = false,
}: {
  socialLinks: ResolvedSocialLink[];
  /** Rounded card sitting on the cream homepage, matching the Figma frame. */
  inset?: boolean;
}) {
  return (
    <footer className={cn("bg-[#080808] text-white", inset ? "rounded-[14px]" : "mt-auto")}>
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-9",
          inset ? "p-6 sm:p-12" : "max-w-[1280px] px-4 py-12 sm:px-6 xl:px-0",
        )}
      >
        <div className="flex flex-col gap-8 xl:flex-row xl:gap-12">
          <div className="flex flex-col gap-4 xl:w-[420px]">
            <p className="text-[28px] font-medium leading-[1.4]">{SITE_BRAND}</p>
            <p className="max-w-[380px] text-[13px] leading-[1.6]">
              香港 Pokémon TCG 專門店 · 單卡買賣 · 店賽舉辦
            </p>
            {SHOW_STORE_ADDRESS ? (
              <p className="text-[13px] leading-[1.6]">
                <a
                  href={getStoreMapsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#c8a24a]"
                >
                  {STORE.address.zh}
                </a>
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 xl:w-[150px]">
            <p className={columnTitle}>商店</p>
            <Link href="/products" className={columnLink}>
              全部商品
            </Link>
            <Link href="/products?type=SINGLE" className={columnLink}>
              單卡
            </Link>
            <Link href="/products?type=SEALED_BOX" className={columnLink}>
              封盒
            </Link>
          </div>
          <div className="flex flex-col gap-3 xl:w-[150px]">
            <p className={columnTitle}>資訊</p>
            <Link href="/about" className={columnLink}>
              關於我們
            </Link>
            <Link href="/shipping" className={columnLink}>
              送貨方式
            </Link>
            <Link href="/payment" className={columnLink}>
              付款方式
            </Link>
            <Link href="/tournaments" className={columnLink}>
              店賽日程
            </Link>
          </div>
          <div className="flex flex-col gap-3 xl:w-[260px]">
            <p className={columnTitle}>聯絡</p>
            <p className="text-[13px] leading-[1.6]">{STORE.hours}</p>
            {SHOW_STORE_ADDRESS ? <p className="text-[13px] leading-[1.6]">{STORE.mtr}</p> : null}
            <p className="text-[13px] leading-[1.6]">社交媒體</p>
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.accessibleName}
                className={columnLink}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 text-[13px] leading-[1.6] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE_BRAND}. All rights reserved.
          </p>
          <Link href="/demo" className="hover:text-[#c8a24a]">
            公開示範店
          </Link>
        </div>
      </div>
    </footer>
  );
}
