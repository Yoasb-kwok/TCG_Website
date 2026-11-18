"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { FoundationButton } from "@/components/foundations/button";
import { buttonVariants } from "@/components/ui/button";
import { SITE_BRAND } from "@/lib/constants";
import { CASHIER_SIDEBAR_LINKS, MERCHANT_SIDEBAR_LINKS } from "@/lib/staff-nav";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const navLink =
  "block text-[14px] font-bold leading-[1.45] text-trtcg-ink transition hover:text-trtcg-secondary-border";

export function AdminSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const themeLabel = isDark ? "切換至淺色模式" : "切換至深色模式";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 rounded-3xl bg-white p-6 text-trtcg-ink xl:w-60">
      <div>
        <p className="text-[28px] font-bold leading-[1.4]">商家後台</p>
        <p className="mt-2 text-[13px] leading-[1.6] text-trtcg-muted">{SITE_BRAND}</p>
      </div>

      <nav className="flex flex-col gap-6" aria-label="商家選單">
        {MERCHANT_SIDEBAR_LINKS.map((link) => {
          const exact = "exact" in link && link.exact;
          const active = exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(navLink, active && "text-trtcg-secondary-border")}
            >
              {link.label}
            </Link>
          );
        })}
        <Link href="/pos" className={navLink}>
          收銀帳務
        </Link>
        {CASHIER_SIDEBAR_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(navLink, active && "text-trtcg-secondary-border")}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="h-px bg-[rgba(200,162,74,0.55)]" />
      <p className="text-[13px] leading-[1.6] text-trtcg-muted">主題</p>
      <FoundationButton
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {themeLabel}
      </FoundationButton>
      <Link
        href="/"
        target="_blank"
        className={cn(buttonVariants({ variant: "quiet" }), "w-full")}
      >
        查看網店
      </Link>
      <FoundationButton
        type="button"
        variant="quiet"
        className="w-full"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        登出
      </FoundationButton>
    </aside>
  );
}
