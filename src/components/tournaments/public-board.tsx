"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  computeStandings,
  defaultBoard,
  formatClock,
  latestRound,
  playerName,
  publishBoardInput,
  roundMatches,
  type BoardState,
  type Match,
} from "@/lib/tournament-board";

function scoreLabel(match: Match) {
  if (match.bId == null) return "輪空";
  if (match.winsA == null || match.winsB == null) return "—";
  if (match.winsA === 0 && match.winsB === 0) return "和";
  return `${match.winsA}–${match.winsB}`;
}

export function PublicBoard() {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const pull = () => {
      fetch("/api/tournaments/board", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("board"))))
        .then((data: { board?: unknown }) => {
          if (cancelled) return;
          setBoard(publishBoardInput(data.board ?? defaultBoard()));
          setOffline(false);
        })
        .catch(() => {
          if (!cancelled) {
            setOffline(true);
            setBoard((current) => current ?? defaultBoard());
          }
        });
    };
    pull();
    const id = window.setInterval(pull, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  const standings = useMemo(
    () => (board ? computeStandings(board.players, board.matches) : []),
    [board],
  );

  if (!board) {
    return (
      <div className="grid h-dvh place-items-center bg-zinc-950 text-zinc-300">載入計分板…</div>
    );
  }

  const round = latestRound(board.matches);
  const pairings = round ? roundMatches(board.matches, round) : [];
  const remaining =
    board.timerRunning && board.timerEndsAt != null
      ? Math.max(0, board.timerEndsAt - now)
      : board.timerRemainingMs;
  const timeUp = remaining <= 0;
  const urgent = remaining > 0 && remaining <= 60_000;
  const warning = remaining > 60_000 && remaining <= 5 * 60_000;
  const clockColor = timeUp || urgent ? "text-red-400" : warning ? "text-amber-300" : "text-white";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      <header className="flex flex-wrap items-end justify-between gap-6 px-4 py-5 sm:px-8 sm:py-8">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-zinc-400">現場計分板</p>
          <h1 className="mt-1 truncate text-3xl font-bold sm:text-5xl">{board.title || "店賽"}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {round ? `第 ${round} 輪` : "尚未開賽"}
            {offline ? " · 未能更新" : ""}
          </p>
        </div>
        <section aria-label="回合計時" className="ml-auto text-right">
          <p className={cn("text-lg font-semibold sm:text-2xl", timeUp ? "text-red-400" : "text-zinc-300")}>
            {timeUp ? "時間到" : board.timerRunning ? "計時中" : "計時暫停"}
          </p>
          <p
            className={cn(
              "font-mono text-[clamp(4.5rem,16vw,14rem)] leading-none font-bold tabular-nums tracking-tight",
              clockColor,
            )}
          >
            {formatClock(remaining)}
          </p>
        </section>
      </header>

      <div className="grid flex-1 gap-4 px-4 pb-4 lg:grid-cols-2 lg:px-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-2xl font-semibold">本輪配對</h2>
          </div>
          {pairings.length === 0 ? (
            <p className="px-4 py-12 text-center text-xl text-zinc-400">未有配對</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-sm tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">桌</th>
                  <th className="px-2 py-2 font-medium">選手</th>
                  <th className="px-2 py-2 text-center font-medium">比分</th>
                  <th className="px-4 py-2 text-right font-medium">選手</th>
                </tr>
              </thead>
              <tbody>
                {pairings.map((match) => (
                  <tr key={match.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-2xl text-zinc-400 tabular-nums">
                      {match.bId ? match.table : "—"}
                    </td>
                    <td className="px-2 py-3 text-2xl font-semibold sm:text-3xl">
                      {playerName(board.players, match.aId)}
                    </td>
                    <td className="px-2 py-3 text-center font-mono text-3xl font-bold tabular-nums sm:text-4xl">
                      {scoreLabel(match)}
                    </td>
                    <td className="px-4 py-3 text-right text-2xl font-semibold sm:text-3xl">
                      {match.bId ? playerName(board.players, match.bId) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-2xl font-semibold">積分榜</h2>
          </div>
          {standings.length === 0 ? (
            <p className="px-4 py-12 text-center text-xl text-zinc-400">未有選手</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-sm tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">名次</th>
                  <th className="px-2 py-2 font-medium">選手</th>
                  <th className="px-2 py-2 text-right font-medium">積分</th>
                  <th className="px-4 py-2 text-right font-medium">戰績</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={row.playerId} className="border-t border-white/10">
                    <td className="px-4 py-3 text-3xl font-bold text-zinc-400 tabular-nums">{index + 1}</td>
                    <td className={cn("px-2 py-3 text-2xl font-semibold sm:text-3xl", row.dropped && "text-zinc-500")}>
                      {row.name}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-4xl font-bold tabular-nums">{row.points}</td>
                    <td className="px-4 py-3 text-right font-mono text-2xl text-zinc-300 tabular-nums">
                      {row.wins}-{row.losses}-{row.draws}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <footer className="px-6 pb-4 text-xs text-zinc-600">
        <Link href="/pos/scoreboard" className="hover:text-zinc-400">
          職員操作
        </Link>
      </footer>
    </div>
  );
}
