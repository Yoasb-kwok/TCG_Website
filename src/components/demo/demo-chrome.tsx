"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/pos/pos-sell.module.css";
import { SITE_BRAND } from "@/lib/constants";
import { demoCtaClass } from "@/components/demo/demo-look";
import { DEMO_POS_PATH, DEMO_STORE_PATH, demoSurface, type DemoSurface } from "@/lib/demo-paths";
import { cn } from "@/lib/utils";

const TABS: { id: DemoSurface; href: string; label: string }[] = [
  { id: "store", href: DEMO_STORE_PATH, label: "網店" },
  { id: "admin", href: "/admin/demo", label: "後台" },
  { id: "pos", href: "/pos/demo", label: "POS" },
];

export function DemoChrome({ trialHref }: { trialHref: string | null }) {
  const pathname = usePathname() ?? DEMO_STORE_PATH;
  const surface = demoSurface(pathname);
  const sellDesk = pathname === DEMO_POS_PATH;

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#070b14]/95 text-slate-50 backdrop-blur-md">
      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3">
        <Link
          href="/"
          className="justify-self-start truncate text-sm font-medium text-slate-400 hover:text-white"
        >
          ← {SITE_BRAND}
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white sm:inline">
            示範店
          </span>
          <nav
            aria-label="示範店表面"
            className={cn(
              "flex rounded-full border border-white/10 bg-white/5 p-0.5 text-sm",
              sellDesk && styles.tabs,
            )}
          >
            {TABS.map((tab) => {
              const active = surface === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium sm:px-3",
                    active ? "bg-white text-[#070b14]" : "text-slate-300 hover:text-white",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {trialHref ? (
          <a
            href={trialHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(demoCtaClass, "justify-self-end whitespace-nowrap px-3 py-1.5")}
          >
            聯絡試用
          </a>
        ) : (
          <Link href="/" className={cn(demoCtaClass, "justify-self-end whitespace-nowrap px-3 py-1.5")}>
            聯絡試用
          </Link>
        )}
      </div>
    </div>
  );
}
