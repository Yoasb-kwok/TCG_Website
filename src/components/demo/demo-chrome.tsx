"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_BRAND } from "@/lib/constants";
import { demoSurface, type DemoSurface } from "@/lib/demo-paths";
import { cn } from "@/lib/utils";

const TABS: { id: DemoSurface; href: string; label: string }[] = [
  { id: "store", href: "/demo", label: "網店" },
  { id: "admin", href: "/admin/demo", label: "後台" },
  { id: "pos", href: "/pos/demo", label: "POS" },
];

export function DemoChrome({ trialHref }: { trialHref: string | null }) {
  const pathname = usePathname() ?? "/demo";
  const surface = demoSurface(pathname);

  return (
    <div className="sticky top-0 z-40 border-b border-amber-300/40 bg-zinc-950 text-zinc-50">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2">
        <Link
          href="/"
          className="justify-self-start truncate text-sm font-medium text-zinc-300 hover:text-white"
        >
          ← {SITE_BRAND}
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold tracking-wide text-zinc-950 sm:inline">
            示範店
          </span>
          <nav aria-label="示範店表面" className="flex rounded-full bg-white/10 p-0.5 text-sm">
            {TABS.map((tab) => {
              const active = surface === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium sm:px-3",
                    active ? "bg-white text-zinc-950" : "text-zinc-300 hover:text-white",
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
            className="justify-self-end rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-950 hover:bg-amber-200"
          >
            聯絡試用
          </a>
        ) : (
          <Link
            href="/"
            className="justify-self-end rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-950 hover:bg-amber-200"
          >
            聯絡試用
          </Link>
        )}
      </div>
    </div>
  );
}
