"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Maximize, Pause, Play, RotateCcw, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  canPair,
  computeStandings,
  createRound,
  defaultBoard,
  formatClock,
  formatPct,
  latestRound,
  loadBoard,
  normalizeTimer,
  playerName,
  roundComplete,
  roundMatches,
  saveBoard,
  setMatchResult,
  undoRound,
  type BoardState,
  type Match,
} from "@/lib/tournament-board";

const PRESETS = [50, 30, 25];

const RESULT_OPTIONS = [
  { winsA: 2, winsB: 0, label: "2–0" },
  { winsA: 2, winsB: 1, label: "2–1" },
  { winsA: 1, winsB: 1, label: "1–1" },
  { winsA: 1, winsB: 2, label: "1–2" },
  { winsA: 0, winsB: 2, label: "0–2" },
  { winsA: 1, winsB: 0, label: "1–0" },
  { winsA: 0, winsB: 1, label: "0–1" },
  { winsA: 0, winsB: 0, label: "和局" },
];

let audioContext: AudioContext | null = null;
let alarmNodes: OscillatorNode[] = [];
let alarmStopTimer = 0;

function primeAudio() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!audioContext) audioContext = new Ctx();
  if (audioContext.state === "suspended") void audioContext.resume();
}

function stopAlarm() {
  window.clearTimeout(alarmStopTimer);
  for (const node of alarmNodes) {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
  }
  alarmNodes = [];
}

function playAlarm(onDone: () => void) {
  primeAudio();
  if (!audioContext) return;
  const ctx = audioContext;
  const ring = () => {
    stopAlarm();
    const start = ctx.currentTime + 0.05;
    const pulses = 24;
    for (let index = 0; index < pulses; index += 1) {
      const at = start + index * 0.38;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = index % 2 === 0 ? 880 : 659;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.28);
      alarmNodes.push(osc);
    }
    alarmStopTimer = window.setTimeout(onDone, pulses * 380 + 200);
  };
  if (ctx.state === "suspended") void ctx.resume().then(ring);
  else ring();
}

function scoreLabel(match: Match) {
  if (match.bId == null) return "輪空";
  if (match.winsA == null || match.winsB == null) return "—";
  if (match.winsA === 0 && match.winsB === 0) return "和";
  return `${match.winsA}–${match.winsB}`;
}

export function LiveBoard() {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [viewRound, setViewRound] = useState(1);
  const [editing, setEditing] = useState<Match | null>(null);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [bulkDraft, setBulkDraft] = useState("");
  const [signups, setSignups] = useState<
    { id: string; tournamentTitle: string; playerName: string; phone: string }[]
  >([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [alarmOn, setAlarmOn] = useState(false);
  const expiredRef = useRef(false);

  useEffect(() => {
    const loaded = normalizeTimer(loadBoard());
    const title = new URLSearchParams(window.location.search).get("title")?.trim();
    if (title) loaded.title = title;
    setBoard(loaded);
    setViewRound(Math.max(1, latestRound(loaded.matches)));
  }, []);

  useEffect(() => () => stopAlarm(), []);

  useEffect(() => {
    if (board) saveBoard(board);
  }, [board]);

  useEffect(() => {
    if (!board?.timerRunning || board.timerEndsAt == null) return;
    const endsAt = board.timerEndsAt;
    const id = window.setInterval(() => {
      const left = endsAt - Date.now();
      if (left <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          setAlarmOn(true);
          playAlarm(() => setAlarmOn(false));
        }
        setBoard((prev) =>
          prev && prev.timerRunning
            ? { ...prev, timerRunning: false, timerEndsAt: null, timerRemainingMs: 0 }
            : prev,
        );
        return;
      }
      setNow(Date.now());
    }, 200);
    return () => window.clearInterval(id);
  }, [board?.timerRunning, board?.timerEndsAt]);

  useEffect(() => {
    if (!playersOpen) return;
    let cancelled = false;
    fetch("/api/tournaments/registrations")
      .then((res) => res.json())
      .then(
        (data: {
          tournaments?: {
            title: string;
            registrations: { id: string; playerName: string; phone: string }[];
          }[];
        }) => {
          if (cancelled) return;
          setSignups(
            (data.tournaments ?? []).flatMap((tournament) =>
              tournament.registrations.map((registration) => ({
                id: registration.id,
                tournamentTitle: tournament.title,
                playerName: registration.playerName,
                phone: registration.phone,
              })),
            ),
          );
        },
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [playersOpen]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const standings = useMemo(
    () => (board ? computeStandings(board.players, board.matches) : []),
    [board],
  );

  if (!board) {
    return (
      <div className="grid h-dvh place-items-center bg-zinc-950 text-zinc-300">
        載入計分板…
      </div>
    );
  }

  const maxRound = latestRound(board.matches);
  const shownRound = maxRound === 0 ? 0 : Math.min(viewRound, maxRound);
  const pairings = shownRound ? roundMatches(board.matches, shownRound) : [];
  const pending = pairings.filter(
    (match) => match.bId && (match.winsA == null || match.winsB == null),
  ).length;
  const remaining =
    board.timerRunning && board.timerEndsAt != null
      ? Math.max(0, board.timerEndsAt - now)
      : board.timerRemainingMs;
  const timeUp = remaining <= 0;
  const urgent = remaining <= 60_000;
  const warning = remaining <= 5 * 60_000;
  const activeCount = board.players.filter((player) => !player.dropped).length;
  const pairReady = canPair(board);

  const update = (next: BoardState) => setBoard(next);

  const addPlayers = (names: string[]) => {
    const nextPlayers = names
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ id: crypto.randomUUID(), name, dropped: false }));
    if (nextPlayers.length === 0) return;
    update({ ...board, players: [...board.players, ...nextPlayers] });
  };

  const silenceAlarm = () => {
    stopAlarm();
    setAlarmOn(false);
  };

  const startTimer = () => {
    primeAudio();
    silenceAlarm();
    expiredRef.current = false;
    const started = Date.now();
    setNow(started);
    setBoard((prev) => {
      if (!prev) return prev;
      const left = prev.timerRemainingMs > 0 ? prev.timerRemainingMs : prev.roundMinutes * 60_000;
      return {
        ...prev,
        timerRunning: true,
        timerRemainingMs: left,
        timerEndsAt: started + left,
      };
    });
  };

  const pauseTimer = () => {
    setBoard((prev) => {
      if (!prev) return prev;
      const left =
        prev.timerEndsAt != null
          ? Math.max(0, prev.timerEndsAt - Date.now())
          : prev.timerRemainingMs;
      return { ...prev, timerRunning: false, timerEndsAt: null, timerRemainingMs: left };
    });
  };

  const setMinutes = (minutes: number) => {
    silenceAlarm();
    expiredRef.current = false;
    update({
      ...board,
      roundMinutes: minutes,
      timerRunning: false,
      timerEndsAt: null,
      timerRemainingMs: minutes * 60_000,
    });
  };

  const addMinutes = (minutes: number) => {
    silenceAlarm();
    expiredRef.current = false;
    const base =
      board.timerRunning && board.timerEndsAt != null
        ? Math.max(0, board.timerEndsAt - Date.now())
        : board.timerRemainingMs;
    const next = base + minutes * 60_000;
    update({
      ...board,
      timerRemainingMs: next,
      timerEndsAt: board.timerRunning ? Date.now() + next : null,
    });
  };

  const pairNext = () => {
    const next = createRound(board);
    update(next);
    setViewRound(latestRound(next.matches));
  };

  const undoLatest = () => {
    const round = latestRound(board.matches);
    const reported = roundMatches(board.matches, round).some(
      (match) => match.bId && match.winsA != null,
    );
    if (reported && !window.confirm(`第 ${round} 輪已有比分，確定撤回？`)) return;
    const next = undoRound(board);
    update(next);
    setViewRound(Math.max(1, latestRound(next.matches)));
  };

  const resetBoard = () => {
    if (!window.confirm("清除所有選手、配對同計時？")) return;
    silenceAlarm();
    expiredRef.current = false;
    setViewRound(1);
    setEditing(null);
    update(defaultBoard());
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50 lg:h-dvh">
      <header className="grid shrink-0 gap-4 border-b border-white/10 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/tournaments" className="text-xs font-medium text-pink-300 hover:text-pink-200">
              ← 店賽
            </Link>
            <p className="text-xs text-zinc-400">瑞士輪 · 勝 3 · 和 1 · 負 0 · 同分比 OMP、GWP、OGP</p>
          </div>
          <input
            value={board.title}
            aria-label="賽事名稱"
            onChange={(event) => update({ ...board, title: event.target.value })}
            className="mt-1 w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-zinc-600 sm:text-3xl"
            placeholder="賽事名稱"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlayersOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium hover:bg-white/15"
            >
              <Users className="size-4" />
              選手 {board.players.length}
            </button>
            <button
              type="button"
              disabled={!pairReady}
              onClick={pairNext}
              className="inline-flex h-9 items-center rounded-lg bg-pink-500 px-3 text-sm font-semibold text-white hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {maxRound === 0 ? "配對第 1 輪" : `配對第 ${maxRound + 1} 輪`}
            </button>
            {maxRound > 0 && (
              <button
                type="button"
                onClick={undoLatest}
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-zinc-300 hover:bg-white/10"
              >
                撤回第 {maxRound} 輪
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-300 hover:bg-white/10"
            >
              <Maximize className="size-4" />
              {fullscreen ? "離開全螢幕" : "全螢幕"}
            </button>
            {!pairReady && activeCount >= 2 && maxRound > 0 && (
              <span className="text-sm text-amber-300">請先填完本輪比分</span>
            )}
            {activeCount < 2 && (
              <span className="text-sm text-zinc-400">至少兩位未退賽選手先可以配對</span>
            )}
          </div>
        </div>

        <section
          aria-label="回合計時"
          className="flex flex-col items-start gap-2 lg:items-end"
        >
          <p className={cn("text-sm font-semibold", timeUp ? "text-red-400" : "text-zinc-400")}>
            {timeUp ? "時間到" : board.timerRunning ? "計時中" : "計時暫停"}
          </p>
          <p
            className={cn(
              "font-mono text-7xl leading-none font-bold tabular-nums tracking-tight sm:text-8xl",
              timeUp ? "text-red-400" : urgent ? "text-red-400" : warning ? "text-amber-300" : "text-white",
            )}
          >
            {formatClock(remaining)}
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setMinutes(minutes)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-sm",
                  board.roundMinutes === minutes && !board.timerRunning
                    ? "bg-white text-zinc-950"
                    : "bg-white/10 text-zinc-200 hover:bg-white/15",
                )}
              >
                {minutes} 分
              </button>
            ))}
            <button
              type="button"
              onClick={board.timerRunning ? pauseTimer : startTimer}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950"
            >
              {board.timerRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {board.timerRunning ? "暫停" : "開始"}
            </button>
            <button
              type="button"
              onClick={() => addMinutes(1)}
              className="h-8 rounded-md bg-white/10 px-2.5 text-sm hover:bg-white/15"
            >
              +1 分
            </button>
            <button
              type="button"
              onClick={() => addMinutes(5)}
              className="h-8 rounded-md bg-white/10 px-2.5 text-sm hover:bg-white/15"
            >
              +5 分
            </button>
            <button
              type="button"
              onClick={() => setMinutes(board.roundMinutes)}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              <RotateCcw className="size-3.5" />
              重置
            </button>
            {alarmOn && (
              <button
                type="button"
                onClick={silenceAlarm}
                className="h-8 rounded-md bg-red-500 px-3 text-sm font-semibold text-white hover:bg-red-400"
              >
                停止鬧鐘
              </button>
            )}
          </div>
        </section>
      </header>

      <div className="grid gap-4 p-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden lg:p-6">
        <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] lg:h-full lg:min-h-0 lg:overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h2 className="text-lg font-semibold">本輪配對</h2>
            <div className="flex flex-wrap items-center gap-2">
              {maxRound > 1 &&
                Array.from({ length: maxRound }, (_, index) => index + 1).map((round) => (
                  <button
                    key={round}
                    type="button"
                    onClick={() => setViewRound(round)}
                    className={cn(
                      "h-8 rounded-md px-2.5 text-sm",
                      shownRound === round ? "bg-white text-zinc-950" : "bg-white/10 hover:bg-white/15",
                    )}
                  >
                    第 {round} 輪
                  </button>
                ))}
              {maxRound === 1 && <span className="text-sm text-zinc-400">第 1 輪</span>}
              {pending > 0 && <span className="text-sm text-amber-300">未填 {pending} 場</span>}
            </div>
          </div>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
            {pairings.length === 0 ? (
              <p className="px-4 py-10 text-center text-zinc-400">
                加入選手後，按「配對第 1 輪」。比分會即時更新右邊積分榜。
              </p>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-zinc-950/95 text-xs tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">桌</th>
                    <th className="px-2 py-2 font-medium">選手</th>
                    <th className="px-2 py-2 text-center font-medium">比分</th>
                    <th className="px-4 py-2 text-right font-medium">選手</th>
                  </tr>
                </thead>
                <tbody>
                  {pairings.map((match) => {
                    const reported = match.winsA != null && match.winsB != null;
                    const aWins = reported && match.bId && (match.winsA ?? 0) > (match.winsB ?? 0);
                    const bWins = reported && match.bId && (match.winsB ?? 0) > (match.winsA ?? 0);
                    return (
                      <tr key={match.id} className="border-t border-white/10">
                        <td className="px-4 py-3 text-lg text-zinc-400 tabular-nums">
                          {match.bId ? match.table : "—"}
                        </td>
                        <td className={cn("px-2 py-3 text-xl font-semibold", aWins && "text-pink-300")}>
                          {playerName(board.players, match.aId)}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {match.bId ? (
                            <button
                              type="button"
                              onClick={() => setEditing(match)}
                              className={cn(
                                "min-w-16 rounded-lg px-3 py-1.5 font-mono text-2xl font-bold tabular-nums",
                                reported
                                  ? "bg-white/10 hover:bg-white/15"
                                  : "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25",
                              )}
                            >
                              {scoreLabel(match)}
                            </button>
                          ) : (
                            <span className="font-mono text-lg text-zinc-400">輪空 +3</span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right text-xl font-semibold",
                            bWins && "text-pink-300",
                          )}
                        >
                          {match.bId ? playerName(board.players, match.bId) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] lg:h-full lg:min-h-0 lg:overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">積分榜</h2>
              <p className="text-xs text-zinc-500">OMP 對手勝率 · GWP 局勝率 · OGP 對手局勝率</p>
            </div>
            <p className="text-sm text-zinc-400">
              {shownRound ? `計至第 ${maxRound} 輪` : "尚未開賽"}
            </p>
          </div>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
            {standings.length === 0 ? (
              <p className="px-4 py-10 text-center text-zinc-400">未有選手</p>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-zinc-950/95 text-xs tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">名次</th>
                    <th className="px-2 py-2 font-medium">選手</th>
                    <th className="px-2 py-2 text-right font-medium">積分</th>
                    <th className="px-2 py-2 text-right font-medium">戰績</th>
                    <th className="px-2 py-2 text-right font-medium">OMP</th>
                    <th className="px-2 py-2 text-right font-medium">GWP</th>
                    <th className="px-4 py-2 text-right font-medium">OGP</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.playerId} className="border-t border-white/10">
                      <td className="px-4 py-3 text-2xl font-bold text-zinc-400 tabular-nums">
                        {index + 1}
                      </td>
                      <td className={cn("px-2 py-3 text-xl font-semibold", row.dropped && "text-zinc-500")}>
                        {row.name}
                        {row.dropped && (
                          <span className="ml-2 align-middle text-xs font-medium text-zinc-500">退賽</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-3xl font-bold tabular-nums">
                        {row.points}
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-lg text-zinc-300 tabular-nums">
                        {row.wins}-{row.losses}-{row.draws}
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-lg text-zinc-300 tabular-nums">
                        {row.wins + row.losses + row.draws > 0 ? formatPct(row.omw) : "—"}
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-lg text-zinc-300 tabular-nums">
                        {row.wins + row.losses + row.draws > 0 ? formatPct(row.gwp) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-lg text-zinc-300 tabular-nums">
                        {row.wins + row.losses + row.draws > 0 ? formatPct(row.ogp) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="bg-zinc-900 text-zinc-50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              第 {editing?.table} 桌比分
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editing ? playerName(board.players, editing.aId) : ""} 對{" "}
              {editing?.bId ? playerName(board.players, editing.bId) : ""}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-2">
              {RESULT_OPTIONS.map((option) => {
                const selected = editing.winsA === option.winsA && editing.winsB === option.winsB;
                const left = playerName(board.players, editing.aId);
                const right = editing.bId ? playerName(board.players, editing.bId) : "";
                const caption =
                  option.winsA === option.winsB
                    ? option.winsA === 0
                      ? "和局"
                      : `和局 ${option.label}`
                    : option.winsA > option.winsB
                      ? `${left} 勝 ${option.winsA}–${option.winsB}`
                      : `${right} 勝 ${option.winsB}–${option.winsA}`;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      update(setMatchResult(board, editing.id, option.winsA, option.winsB));
                      setEditing(null);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left text-sm font-semibold",
                      selected
                        ? "border-pink-400 bg-pink-500/20 text-white"
                        : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    {caption}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={playersOpen} onOpenChange={setPlayersOpen}>
        <DialogContent className="bg-zinc-900 text-zinc-50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>選手名單</DialogTitle>
            <DialogDescription className="text-zinc-400">
              資料只存在這部電腦的瀏覽器，大螢幕請用同一部電腦開啟。退賽選手不會再被配對。
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addPlayers([nameDraft]);
              setNameDraft("");
            }}
          >
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="選手名稱"
              className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-pink-400"
            />
            <button
              type="submit"
              className="h-9 rounded-lg bg-pink-500 px-3 text-sm font-semibold text-white"
            >
              加入
            </button>
          </form>
          <textarea
            value={bulkDraft}
            onChange={(event) => setBulkDraft(event.target.value)}
            placeholder={"一次加入多位，每行一個名稱"}
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-pink-400"
          />
          <button
            type="button"
            onClick={() => {
              addPlayers(bulkDraft.split(/\r?\n/));
              setBulkDraft("");
            }}
            className="h-9 rounded-lg bg-white/10 text-sm font-medium hover:bg-white/15"
          >
            加入以上名單
          </button>
          {signups.length > 0 && (
            <div className="space-y-2 rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">報名名單</p>
                <button
                  type="button"
                  onClick={() => {
                    const existing = new Set(board.players.map((player) => player.name));
                    addPlayers(
                      signups
                        .map((signup) => signup.playerName)
                        .filter((name) => !existing.has(name)),
                    );
                  }}
                  className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                >
                  加入為選手
                </button>
              </div>
              <ul className="max-h-32 space-y-1 overflow-auto text-sm text-zinc-300">
                {signups.map((signup) => (
                  <li key={signup.id}>
                    {signup.playerName}
                    <span className="ml-2 font-mono text-zinc-400">{signup.phone}</span>
                    <span className="ml-2 text-xs text-zinc-500">{signup.tournamentTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="max-h-64 space-y-2 overflow-auto">
            {board.players.map((player) => {
              const locked = board.matches.some(
                (match) => match.aId === player.id || match.bId === player.id,
              );
              return (
                <li key={player.id} className="flex items-center gap-2 text-sm">
                  <span className={cn("min-w-0 flex-1 truncate", player.dropped && "text-zinc-500")}>
                    {player.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        ...board,
                        players: board.players.map((item) =>
                          item.id === player.id ? { ...item, dropped: !item.dropped } : item,
                        ),
                      })
                    }
                    className="rounded-md px-2 py-1 text-zinc-300 hover:bg-white/10"
                  >
                    {player.dropped ? "恢復" : "退賽"}
                  </button>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      update({
                        ...board,
                        players: board.players.filter((item) => item.id !== player.id),
                      })
                    }
                    className="rounded-md px-2 py-1 text-red-300 hover:bg-white/10 disabled:opacity-30"
                  >
                    刪除
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={resetBoard}
            className="text-left text-sm text-red-300 hover:text-red-200"
          >
            清除整場賽事
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
