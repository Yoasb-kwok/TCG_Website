"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "@/components/pos/pos-sell.module.css";
import { NAV_ITEMS } from "@/lib/constants";
import { demoPosPath } from "@/lib/demo-paths";
import { DEMO_SHOP } from "@/lib/demo-shop";
import { POS_TABS, type PosTabId } from "@/lib/staff-nav";
import { cn } from "@/lib/utils";

export function PosShell({
  current,
  children,
  storefrontNav = false,
  demo = false,
  sell = false,
}: {
  current: PosTabId;
  children: React.ReactNode;
  /** 收卡沿用網店導覽：商品、最新預訂、店賽、關於我們、送貨、付款。 */
  storefrontNav?: boolean;
  /** Public demo register. Tabs stay under /pos/demo and skip auth. */
  demo?: boolean;
  /** Sell desk only. Hover, press, and tab scale stay off the other cashiers. */
  sell?: boolean;
}) {
  const { data: session } = useSession();
  const email = demo ? "示範收銀" : (session?.user?.email ?? "admin@trtcg.hk");

  return (
    <div
      className={cn(
        "pos-soft relative flex min-h-0 flex-col",
        demo ? "h-full" : "h-dvh",
        sell && styles.root,
      )}
      style={{ fontFamily: "var(--font-pos), var(--font-sans), sans-serif" }}
    >
      <div className="pos-wallpaper" aria-hidden />
      <header className="relative z-10 flex min-h-[96px] shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-[#090909] px-4 py-4 lg:px-16">
        <div className="flex items-center gap-3 text-white">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#c89c45] text-[13px] font-bold text-[#090909]">
            TCG
          </span>
          <span className="text-[22px] font-bold tracking-tight">{demo ? DEMO_SHOP.name : "TCGHK POS"}</span>
        </div>
        <nav className={cn("flex flex-wrap items-center gap-2", sell && styles.tabs)} aria-label="收銀">
          {POS_TABS.map((item) => {
            const active = current === item.id;
            return (
              <Link
                key={item.id}
                href={demo ? demoPosPath(item.href) : item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-[12px] px-3.5 py-[9px] text-[15px] text-white",
                  active ? "bg-[#e84e9e] font-bold" : "font-normal hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link href={demo ? "/admin/demo" : "/admin"} className="text-[14px] font-bold text-white hover:text-white/80">
            商家後台
          </Link>
          <span className="inline-flex items-center rounded-[12px] border border-[#ded6cb] bg-white px-3.5 py-2 text-[14px] text-[#171514]">
            {email}
          </span>
        </div>
      </header>
      {storefrontNav && (
        <nav
          aria-label="網店導覽"
          className="relative z-10 flex flex-wrap gap-x-4 gap-y-1 border-b border-[#ded6cb] px-4 py-2 lg:px-16"
        >
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-[14px] font-bold text-[#706c68] hover:text-[#171514]">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="relative z-10 min-h-0 flex-1">{children}</div>
    </div>
  );
}
