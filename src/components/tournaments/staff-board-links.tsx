"use client";

import Link from "next/link";
import { STAFF_BOARD_LINKS } from "@/lib/tournament-board";
import { cn } from "@/lib/utils";

export function StaffBoardLinks({
  tone = "theme",
  current,
}: {
  tone?: "theme" | "dark";
  current?: "test" | "live";
}) {
  const testClass =
    tone === "dark"
      ? "bg-white text-zinc-950"
      : "border border-border bg-background text-foreground";
  const liveClass =
    tone === "dark"
      ? "border border-white/50 bg-zinc-950 text-white"
      : "bg-foreground text-background";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={STAFF_BOARD_LINKS.test.href}
        aria-current={current === "test" ? "page" : undefined}
        className={cn(
          "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold",
          testClass,
          current === "test" && "ring-2 ring-pink-500",
        )}
      >
        {STAFF_BOARD_LINKS.test.label}
      </Link>
      <Link
        href={STAFF_BOARD_LINKS.live.href}
        aria-current={current === "live" ? "page" : undefined}
        className={cn(
          "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold",
          liveClass,
          current === "live" && "ring-2 ring-pink-500",
        )}
      >
        {STAFF_BOARD_LINKS.live.label}
      </Link>
    </div>
  );
}
