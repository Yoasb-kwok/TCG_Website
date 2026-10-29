import { Suspense } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { posBlackBtn, posSub, posTitle } from "@/components/pos/pos-ui";
import { StaffBoardLinks } from "@/components/tournaments/staff-board-links";
import { LiveBoard } from "@/components/tournaments/live-board";
import Link from "next/link";

export const metadata = { title: "店賽計分" };

export default function PosScoreboardPage() {
  return (
    <PosShell current="scoreboard">
      <div className="flex h-full min-h-0 flex-col gap-5 overflow-auto px-4 py-6 lg:px-16 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>店賽計分</h1>
            <p className={posSub}>瑞士輪配對、回合計時、結果輸入與即時排名。</p>
          </div>
          <Link href="/tournaments/live" target="_blank" className={posBlackBtn}>
            公開計分板
          </Link>
        </div>
        <StaffBoardLinks tone="pos" current="live" />
        <Suspense fallback={<div className="grid min-h-40 place-items-center text-[#706c68]">載入計分板…</div>}>
          <LiveBoard remote embedded />
        </Suspense>
      </div>
    </PosShell>
  );
}
