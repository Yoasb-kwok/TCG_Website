import { Suspense } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { posAction, posPage, posSub, posTitle } from "@/components/pos/pos-ui";
import { StaffBoardLinks } from "@/components/tournaments/staff-board-links";
import { LiveBoard } from "@/components/tournaments/live-board";
import Link from "next/link";

export const metadata = { title: "店賽計分" };

export default function PosScoreboardPage() {
  return (
    <PosShell current="scoreboard">
      <div className={posPage}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>店賽計分</h1>
            <p className={posSub}>瑞士輪配對、回合計時、結果輸入與即時排名。</p>
          </div>
          <Link href="/tournaments/live" target="_blank" className={posAction}>
            公開計分板
          </Link>
        </div>
        <StaffBoardLinks tone="pos" current="live" />
        <Suspense fallback={<div className="grid min-h-40 place-items-center text-trtcg-muted">載入計分板…</div>}>
          <LiveBoard remote embedded />
        </Suspense>
      </div>
    </PosShell>
  );
}
