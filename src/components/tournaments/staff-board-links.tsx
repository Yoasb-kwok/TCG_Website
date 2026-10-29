"use client";

import Link from "next/link";
import { STAFF_BOARD_LINKS } from "@/lib/tournament-board";
import { cn } from "@/lib/utils";

export function StaffBoardLinks({
  tone = "theme",
  current,
}: {
  tone?: "theme" | "dark" | "pos";
  current?: "test" | "live";
}) {
  const testClass =
    tone === "pos"
      ? "border border-[#ded6cb] bg-white text-[#171514]"
      : tone === "dark"
        ? "bg-white text-zinc-950"
        : "border border-border bg-background text-foreground";
  const liveClass =
    tone === "pos"
      ? "bg-[#e84e9e] text-white"
      : tone === "dark"
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
          current === "live" && tone !== "pos" && "ring-2 ring-pink-500",
        )}
      >
        {STAFF_BOARD_LINKS.live.label}
      </Link>
      {tone === "pos" && (
        <Link
          href="/tournaments/live"
          target="_blank"
          className="inline-flex h-9 items-center rounded-full border border-[#ded6cb] bg-white px-4 text-sm font-semibold text-[#171514]"
        >
          公開計分板
        </Link>
      )}
    </div>
  );
}
