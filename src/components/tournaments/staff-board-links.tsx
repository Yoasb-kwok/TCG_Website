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
  const posShape = "h-12 w-[190px] justify-center rounded-[14px] px-[18px] text-[15px] font-bold shadow-[0_5px_8px_rgba(74,44,22,0.08)]";
  const testClass =
    tone === "pos"
      ? cn(posShape, "border border-trtcg-input-border bg-trtcg-surface text-trtcg-ink")
      : tone === "dark"
        ? "bg-white text-zinc-950"
        : "border border-border bg-background text-foreground";
  const liveClass =
    tone === "pos"
      ? cn(posShape, "bg-[var(--pos-accent,#e84e9e)] text-white")
      : tone === "dark"
        ? "border border-white/50 bg-zinc-950 text-white"
        : "bg-foreground text-background";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", tone === "pos" && "gap-3")}>
      <Link
        href={STAFF_BOARD_LINKS.test.href}
        aria-current={current === "test" ? "page" : undefined}
        className={cn(
          "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold",
          testClass,
          current === "test" && tone !== "pos" && "ring-2 ring-pink-500",
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
          className={cn(
            "inline-flex items-center",
            posShape,
            "border border-trtcg-input-border bg-trtcg-surface text-trtcg-ink",
          )}
        >
          公開計分板
        </Link>
      )}
    </div>
  );
}
