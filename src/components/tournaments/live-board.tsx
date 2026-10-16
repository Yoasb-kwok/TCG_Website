"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Maximize, Pause, Play, RotateCcw, Settings, Users } from "lucide-react";
import { StaffBoardLinks } from "@/components/tournaments/staff-board-links";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SHOP_TEST_BOARD_KEY,
  DEFAULT_ROUND_MINUTES,
  TIMER_PRESETS_MINUTES,
  boardKeyFromSearch,
  addMinutesState,
  canPair,
  computeStandings,
  createRound,
  defaultBoard,
  formatClock,
  formatPct,
  latestRound,
  loadBoard,
  loadLastBoardKey,
  matchScoreLabel,
  normalizeTimer,
  parseClockInput,
  playerName,
  roundMatches,
  publishBoardInput,
  saveBoard,
  SCORE_PRESETS,
  scoreButtonText,
  sessionSummary,
  setMatchResult,
  startTimerState,
  testPlayers,
  undoRound,
  type BoardState,
  type Match,
  type ScorePreset,
} from "@/lib/tournament-board";

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

function ScoreChoice({
  preset,
  left,
  right,
  selected,
  onPick,
}: {
  preset: ScorePreset;
  left: string;
  right: string;
  selected: boolean;
  onPick: (winsA: number, winsB: number) => void;
}) {
  const text = scoreButtonText(preset, left, right);
  return (
    <button
      type="button"
      onClick={() => onPick(preset.winsA, preset.winsB)}
      className={cn(
        "rounded-xl border px-3 py-3 text-left",
        selected ? "border-pink-400 bg-pink-500/20 text-white" : "border-white/10 bg-white/5 hover:bg-white/10",
      )}
    >
      <span className="block font-mono text-2xl font-bold tabular-nums">{text.primary}</span>
      {text.secondary ? <span className="mt-1 block text-sm font-medium text-zinc-300">{text.secondary}</span> : null}
    </button>
  );
}

function ScorePicker({
  match,
  left,
  right,
  onPick,
}: {
  match: Match;
  left: string;
  right: string;
  onPick: (winsA: number, winsB: number) => void;
}) {
  const groups: { id: string; label: string; presets: ScorePreset[] }[] = [
    { id: "a", label: left, presets: SCORE_PRESETS.filter((preset) => preset.kind === "win") },
    { id: "b", label: right, presets: SCORE_PRESETS.filter((preset) => preset.kind === "loss") },
  ];
  const other = SCORE_PRESETS.filter((preset) => preset.kind === "zero" || preset.kind === "draw");
  const choice = (preset: ScorePreset) => (
    <ScoreChoice
      key={preset.id}
      preset={preset}
      left={left}
      right={right}
      selected={match.winsA === preset.winsA && match.winsB === preset.winsB}
      onPick={onPick}
    />
  );

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-sm font-medium text-zinc-300">{group.label}</p>
          <div className="grid grid-cols-3 gap-2">{group.presets.map(choice)}</div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">{other.map(choice)}</div>
    </div>
  );
}

export function LiveBoard({ remote = false }: { remote?: boolean }) {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [board, setBoard] = useState<BoardState | null>(null);
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [viewRound, setViewRound] = useState(1);
  const [editing, setEditing] = useState<Match | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [bulkDraft, setBulkDraft] = useState("");
  const [signups, setSignups] = useState<
    { id: string; slug: string; tournamentTitle: string; playerName: string; phone: string }[]
  >([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [alarmOn, setAlarmOn] = useState(false);
  const [clockDraft, setClockDraft] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "ok" | "error" | "denied">("idle");
  const expiredRef = useRef(false);
  const skipClockCommit = useRef(false);
  const clockDraftRef = useRef<string | null>(null);
  const storageKeyRef = useRef("default");
  const remoteReady = useRef(false);
  const loadedJson = useRef("");
  const saveTimer = useRef(0);
  const saveChain = useRef(Promise.resolve());

  const setClockText = (value: string | null) => {
    clockDraftRef.current = value;
    setClockDraft(value);
  };

  useEffect(() => {
    if (remote) {
      let cancelled = false;
      remoteReady.current = false;
      fetch("/api/tournaments/board", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("board"))))
        .then((data: { board?: unknown }) => {
          if (cancelled) return;
          const loaded = publishBoardInput(data.board);
          loadedJson.current = JSON.stringify(loaded);
          remoteReady.current = true;
          storageKeyRef.current = "remote";
          setBoard(loaded);
          setStoredKey("remote");
          setEventSlug("");
          setEventTitle("");
          setViewRound(Math.max(1, latestRound(loaded.matches)));
        })
        .catch(() => {
          if (cancelled) return;
          const loaded = defaultBoard();
          loadedJson.current = JSON.stringify(loaded);
          remoteReady.current = true;
          storageKeyRef.current = "remote";
          setBoard(loaded);
          setStoredKey("remote");
          setSyncState("error");
        });
      return () => {
        cancelled = true;
      };
    }

    const params = new URLSearchParams(searchKey);
    const slug = params.get("slug")?.trim() ?? "";
    const title = params.get("title")?.trim() ?? "";
    const explicit = boardKeyFromSearch(params);
    const key = explicit || loadLastBoardKey() || "default";
    storageKeyRef.current = key;
    const loaded = normalizeTimer(loadBoard(key));
    const untouched =
      loaded.players.length === 0 && loaded.matches.length === 0 && !loaded.timerRunning;
    if (title && (untouched || loaded.title === defaultBoard().title)) loaded.title = title;
    if (key === SHOP_TEST_BOARD_KEY && loaded.players.length === 0 && loaded.matches.length === 0) {
      loaded.players = testPlayers();
    }
    setBoard(loaded);
    setStoredKey(key);
    setEventSlug(slug);
    setEventTitle(title);
    setViewRound(Math.max(1, latestRound(loaded.matches)));
  }, [searchKey, remote]);

  useEffect(() => () => stopAlarm(), []);

  useEffect(() => {
    if (!board || !storedKey || storedKey !== storageKeyRef.current) return;
    if (!remote) {
      saveBoard(board, storedKey);
      return;
    }
    if (!remoteReady.current) return;
    const snapshot = board;
    const json = JSON.stringify(snapshot);
    if (json === loadedJson.current) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveChain.current = saveChain.current
        .catch(() => undefined)
        .then(async () => {
          const res = await fetch("/api/tournaments/board", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: json,
          });
          if (res.ok) {
            loadedJson.current = json;
            setSyncState("ok");
            return;
          }
          setSyncState(res.status === 401 || res.status === 403 ? "denied" : "error");
        })
        .catch(() => setSyncState("error"));
    }, 200);
    return () => window.clearTimeout(saveTimer.current);
  }, [board, storedKey, remote]);

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
    let cancelled = false;
    fetch("/api/tournaments/registrations")
      .then((res) => res.json())
      .then(
        (data: {
          tournaments?: {
            slug: string;
            title: string;
            registrations: { id: string; playerName: string; phone: string }[];
          }[];
        }) => {
          if (cancelled) return;
          setSignups(
            (data.tournaments ?? []).flatMap((tournament) =>
              tournament.registrations.map((registration) => ({
                id: registration.id,
                slug: tournament.slug,
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

  const eventSignups = signups.filter((signup) => {
    if (eventSlug) return signup.slug === eventSlug;
    if (eventTitle) return signup.tournamentTitle === eventTitle;
    return false;
  });
  const rosterSignups = eventSlug || eventTitle ? eventSignups : signups;
  const missingRoster = rosterSignups.filter(
    (signup) => !board.players.some((player) => player.name === signup.playerName),
  );
  const canLoadTest = !remote && board.matches.length === 0 && activeCount < 2;

  const loadTestPlayers = () => {
    if (!canLoadTest) return;
    if (board.players.length > 0 && !window.confirm("加入 8 位試賽選手？")) return;
    addPlayers(testPlayers().map((player) => player.name));
  };

  const keepClockFocus = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  const silenceAlarm = () => {
    stopAlarm();
    setAlarmOn(false);
  };

  const startTimer = () => {
    primeAudio();
    silenceAlarm();
    expiredRef.current = false;
    const typed = clockDraftRef.current == null ? null : parseClockInput(clockDraftRef.current);
    const started = Date.now();
    setNow(started);
    setClockText(null);
    setBoard((prev) => (prev ? startTimerState(prev, typed, started) : prev));
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
    setClockText(null);
    update({
      ...board,
      roundMinutes: minutes,
      timerRunning: false,
      timerEndsAt: null,
      timerRemainingMs: minutes * 60_000,
    });
  };

  const commitClock = (raw: string) => {
    const parsed = parseClockInput(raw);
    setClockText(null);
    if (parsed == null || board.timerRunning) return;
    silenceAlarm();
    expiredRef.current = false;
    const minutes = Math.floor(parsed / 60_000);
    update({
      ...board,
      roundMinutes: minutes > 0 ? minutes : board.roundMinutes,
      timerRunning: false,
      timerEndsAt: null,
      timerRemainingMs: parsed,
    });
  };

  const addMinutes = (minutes: number) => {
    silenceAlarm();
    expiredRef.current = false;
    const typed =
      !board.timerRunning && clockDraftRef.current != null
        ? parseClockInput(clockDraftRef.current)
        : null;
    setClockText(null);
    update(addMinutesState(board, minutes, typed));
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
            {remote ? (
              <Link href="/pos" className="text-xs font-medium text-pink-300 hover:text-pink-200">
                ← 收銀
              </Link>
            ) : (
              <Link href="/tournaments" className="text-xs font-medium text-pink-300 hover:text-pink-200">
                ← 店賽
              </Link>
            )}
            <StaffBoardLinks
              tone="dark"
              current={remote ? "live" : storedKey === SHOP_TEST_BOARD_KEY ? "test" : undefined}
            />
            {remote && (
              <Link
                href="/tournaments/live"
                target="_blank"
                className="text-xs font-medium text-pink-300 hover:text-pink-200"
              >
                公開計分板
              </Link>
            )}
            <p className="text-xs text-zinc-400">瑞士輪 · 勝 3 · 和 1 · 負 0 · 同分比 OMP、GWP、OGP</p>
          </div>
          <div className="mt-1 flex items-start gap-3">
            <input
              value={board.title}
              aria-label="主題"
              maxLength={120}
              onChange={(event) => update({ ...board, title: event.target.value })}
              className="min-w-0 flex-1 bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-zinc-600 sm:text-3xl"
              placeholder="主題"
            />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium hover:bg-white/15"
            >
              <Settings className="size-4" />
              設定
            </button>
          </div>
          {sessionSummary(board) ? (
            <p className="mt-1 text-sm text-zinc-400">{sessionSummary(board)}</p>
          ) : null}
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
            {canLoadTest && (
              <button
                type="button"
                onClick={loadTestPlayers}
                className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-semibold text-zinc-950"
              >
                載入 8 人試賽
              </button>
            )}
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
            {timeUp ? "時間到" : board.timerRunning ? "計時中" : "計時暫停 · 點擊時間可修改"}
          </p>
          {remote && (
            <p className={cn("text-xs", syncState === "ok" ? "text-emerald-300" : syncState === "idle" ? "text-zinc-500" : "text-red-300")}>
              {syncState === "ok"
                ? "已同步公開計分板"
                : syncState === "denied"
                  ? "需要職員登入先可以同步"
                  : syncState === "error"
                    ? "未能同步到公開計分板"
                    : "改動會送到公開計分板"}
            </p>
          )}
          {board.timerRunning ? (
            <p
              className={cn(
                "font-mono text-7xl leading-none font-bold tabular-nums tracking-tight sm:text-8xl",
                timeUp ? "text-red-400" : urgent ? "text-red-400" : warning ? "text-amber-300" : "text-white",
              )}
            >
              {formatClock(remaining)}
            </p>
          ) : (
            <input
              aria-label="設定計時，例如 45:00"
              inputMode="numeric"
              value={clockDraft ?? formatClock(remaining)}
              onFocus={(event) => {
                setClockText(formatClock(remaining));
                event.target.select();
              }}
              onChange={(event) => setClockText(event.target.value)}
              onBlur={() => {
                if (skipClockCommit.current) {
                  skipClockCommit.current = false;
                  setClockText(null);
                  return;
                }
                commitClock(clockDraftRef.current ?? formatClock(remaining));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  skipClockCommit.current = true;
                  setClockText(null);
                  event.currentTarget.blur();
                }
              }}
              className={cn(
                "w-[6.5ch] border-0 border-b border-white/30 bg-transparent p-0 text-right font-mono text-7xl leading-none font-bold tabular-nums tracking-tight outline-none sm:text-8xl",
                timeUp ? "text-red-400" : urgent ? "text-red-400" : warning ? "text-amber-300" : "text-white",
              )}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {TIMER_PRESETS_MINUTES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onMouseDown={keepClockFocus}
                onClick={() => setMinutes(minutes)}
                aria-label={
                  minutes === DEFAULT_ROUND_MINUTES
                    ? `預時間 ${DEFAULT_ROUND_MINUTES} 分鐘`
                    : `${minutes} 分鐘`
                }
                className={cn(
                  "h-8 rounded-md px-2.5 text-sm",
                  !board.timerRunning && board.timerRemainingMs === minutes * 60_000
                    ? "bg-white text-zinc-950"
                    : "bg-white/10 text-zinc-200 hover:bg-white/15",
                )}
              >
                {minutes} 分
              </button>
            ))}
            <button
              type="button"
              onMouseDown={keepClockFocus}
              onClick={board.timerRunning ? pauseTimer : startTimer}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950"
            >
              {board.timerRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {board.timerRunning ? "暫停" : "開始"}
            </button>
            <button
              type="button"
              onMouseDown={keepClockFocus}
              onClick={() => addMinutes(1)}
              className="h-8 rounded-md bg-white/10 px-2.5 text-sm hover:bg-white/15"
            >
              +1 分
            </button>
            <button
              type="button"
              onMouseDown={keepClockFocus}
              onClick={() => addMinutes(5)}
              className="h-8 rounded-md bg-white/10 px-2.5 text-sm hover:bg-white/15"
            >
              +5 分
            </button>
            <button
              type="button"
              onMouseDown={keepClockFocus}
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

      {(eventSlug || eventTitle) && missingRoster.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 lg:px-6">
          <p className="text-sm text-zinc-300">
            本場報名 {rosterSignups.length} 人，尚有 {missingRoster.length} 人未加入計分板
          </p>
          <button
            type="button"
            onClick={() => addPlayers(missingRoster.map((signup) => signup.playerName))}
            className="inline-flex h-9 items-center rounded-lg bg-pink-500 px-3 text-sm font-semibold text-white hover:bg-pink-400"
          >
            加入報名選手
          </button>
        </div>
      )}

      <div className="grid gap-4 p-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden lg:p-6">
        <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:overflow-hidden">
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
          <div className="lg:min-h-0 lg:overflow-auto">
            {pairings.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-zinc-400">
                  加入選手後，按「配對第 1 輪」。比分會即時更新右邊積分榜。
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayersOpen(true)}
                    className="inline-flex h-9 items-center rounded-lg bg-white/10 px-3 text-sm font-medium hover:bg-white/15"
                  >
                    加入選手
                  </button>
                  {canLoadTest && (
                    <button
                      type="button"
                      onClick={loadTestPlayers}
                      className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-semibold text-zinc-950"
                    >
                      載入 8 人試賽
                    </button>
                  )}
                </div>
              </div>
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
                              {matchScoreLabel(match)}
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

        <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">積分榜</h2>
              <p className="text-xs text-zinc-500">OMP 對手勝率 · GWP 局勝率 · OGP 對手局勝率</p>
            </div>
            <p className="text-sm text-zinc-400">
              {shownRound ? `計至第 ${maxRound} 輪` : "尚未開賽"}
            </p>
          </div>
          <div className="lg:min-h-0 lg:overflow-auto">
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
        <DialogContent className="bg-zinc-900 text-zinc-50 sm:max-w-xl">
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
            <ScorePicker
              match={editing}
              left={playerName(board.players, editing.aId)}
              right={editing.bId ? playerName(board.players, editing.bId) : ""}
              onPick={(winsA, winsB) => {
                update(setMatchResult(board, editing.id, winsA, winsB));
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-zinc-900 text-zinc-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>場次設定</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {remote
                ? "場次編號、主題同日期會顯示喺公開計分板。"
                : "試賽設定只留喺這部電腦。"}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium">
            場次編號
            <input
              value={board.sessionNumber}
              maxLength={40}
              onChange={(event) => update({ ...board, sessionNumber: event.target.value })}
              placeholder="例如 3"
              className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base outline-none focus:border-pink-400"
            />
          </label>
          <label className="block text-sm font-medium">
            主題
            <input
              value={board.title}
              maxLength={120}
              onChange={(event) => update({ ...board, title: event.target.value })}
              placeholder="例如 Pokémon TCG Gym Battle"
              className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base outline-none focus:border-pink-400"
            />
          </label>
          <label className="block text-sm font-medium">
            日期
            <input
              type="date"
              value={board.sessionDate}
              onChange={(event) => update({ ...board, sessionDate: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base outline-none [color-scheme:dark] focus:border-pink-400"
            />
          </label>
        </DialogContent>
      </Dialog>

      <Dialog open={playersOpen} onOpenChange={setPlayersOpen}>
        <DialogContent className="bg-zinc-900 text-zinc-50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>選手名單</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {remote
                ? "名單、比分同計時會同步到公開計分板，電視請開現場計分板。退賽選手不會再被配對。"
                : "資料只存在這部電腦的瀏覽器，大螢幕請用同一部電腦開啟。退賽選手不會再被配對。"}
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
          {rosterSignups.length > 0 && (
            <div className="space-y-2 rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {eventSlug || eventTitle ? "本場報名" : "報名名單"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const existing = new Set(board.players.map((player) => player.name));
                    addPlayers(
                      rosterSignups
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
                {rosterSignups.map((signup) => (
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
