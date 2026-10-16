/** Swiss scoring modelled on MtG Arena: win 3, draw 1, loss 0. */

export type Player = {
  id: string;
  name: string;
  dropped: boolean;
};

export type Match = {
  id: string;
  round: number;
  table: number;
  aId: string;
  bId: string | null;
  winsA: number | null;
  winsB: number | null;
};

export type BoardState = {
  title: string;
  /** 場次編號. Empty until staff fill in 設定. */
  sessionNumber: string;
  /** 日期 as YYYY-MM-DD. Empty until staff fill in 設定. */
  sessionDate: string;
  players: Player[];
  matches: Match[];
  roundMinutes: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
  timerRemainingMs: number;
};

export type Standing = {
  playerId: string;
  name: string;
  dropped: boolean;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  /** Opponents' match-win percentage. Opponent rates below 33.33% count as 33.33%. */
  omw: number;
  /** Game-win percentage, not raised to the 33.33% floor. */
  gwp: number;
  /** Opponents' game-win percentage, with the same 33.33% floor. */
  ogp: number;
};

const LEGACY_STORAGE_KEY = "tcghk-live-board-v1";
const STORE_KEY = "tcghk-live-boards-v2";
export const SHOP_TEST_BOARD_KEY = "shop-test";
export const TEST_PLAYER_NAMES = ["試賽 1", "試賽 2", "試賽 3", "試賽 4", "試賽 5", "試賽 6", "試賽 7", "試賽 8"];

/** Shop clock presets, in the order the scoreboard shows them. 25 is the default pre-time. */
export const TIMER_PRESETS_MINUTES = [50, 30, 25] as const;
export const DEFAULT_ROUND_MINUTES = 25;

/**
 * Public projector surface. Top and bottom chrome images (上下圖) stay off
 * so the front overlay is only the clock, pairings, and standings.
 */
export const FRONT_OVERLAY = {
  showTopImage: false,
  showBottomImage: false,
} as const;

export type ScorePreset = {
  id: string;
  winsA: number;
  winsB: number;
  kind: "win" | "loss" | "zero" | "draw";
};

/** Picker order: 2-0, 2-1, 1-0, 0-0, draw, then the other seat. */
export const SCORE_PRESETS: ScorePreset[] = [
  { id: "2-0", winsA: 2, winsB: 0, kind: "win" },
  { id: "2-1", winsA: 2, winsB: 1, kind: "win" },
  { id: "1-0", winsA: 1, winsB: 0, kind: "win" },
  { id: "0-0", winsA: 0, winsB: 0, kind: "zero" },
  { id: "draw", winsA: 1, winsB: 1, kind: "draw" },
  { id: "0-2", winsA: 0, winsB: 2, kind: "loss" },
  { id: "1-2", winsA: 1, winsB: 2, kind: "loss" },
  { id: "0-1", winsA: 0, winsB: 1, kind: "loss" },
];

type BoardStore = {
  lastKey: string;
  boards: Record<string, BoardState>;
};

export function defaultBoard(): BoardState {
  return {
    title: "店賽",
    sessionNumber: "",
    sessionDate: "",
    players: [],
    matches: [],
    roundMinutes: DEFAULT_ROUND_MINUTES,
    timerRunning: false,
    timerEndsAt: null,
    timerRemainingMs: DEFAULT_ROUND_MINUTES * 60 * 1000,
  };
}

function cleanLine(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/** Keep a real calendar date. Anything else is stored as unset. */
export function cleanSessionDate(value: unknown) {
  if (typeof value !== "string") return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return "";
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function formatSessionDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

export function sessionSummary(board: Pick<BoardState, "sessionNumber" | "sessionDate">) {
  const parts: string[] = [];
  const number = board.sessionNumber.trim();
  if (number) parts.push(`場次 ${number}`);
  const date = formatSessionDate(board.sessionDate);
  if (date) parts.push(date);
  return parts.join(" · ");
}

export function scoreButtonText(preset: ScorePreset, left: string, right: string) {
  if (preset.kind === "zero") return { primary: "0–0", secondary: "" };
  if (preset.kind === "draw") return { primary: "和局", secondary: "1–1" };
  if (preset.kind === "win") {
    return { primary: `${preset.winsA}–${preset.winsB}`, secondary: `${left} 勝` };
  }
  return { primary: `${preset.winsB}–${preset.winsA}`, secondary: `${right} 勝` };
}

export function matchScoreLabel(match: Pick<Match, "bId" | "winsA" | "winsB">) {
  if (match.bId == null) return "輪空";
  if (match.winsA == null || match.winsB == null) return "—";
  if (match.winsA === 0 && match.winsB === 0) return "0–0";
  if (match.winsA === match.winsB) return "和";
  return `${match.winsA}–${match.winsB}`;
}

function sanitizeBoard(parsed: Partial<BoardState>): BoardState {
  const fallback = defaultBoard();
  return {
    ...fallback,
    ...parsed,
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : fallback.title,
    sessionNumber: cleanLine(parsed.sessionNumber, 40),
    sessionDate: cleanSessionDate(parsed.sessionDate),
    players: Array.isArray(parsed.players) ? parsed.players : [],
    matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    roundMinutes: typeof parsed.roundMinutes === "number" ? parsed.roundMinutes : fallback.roundMinutes,
    timerRunning: Boolean(parsed.timerRunning),
    timerEndsAt: typeof parsed.timerEndsAt === "number" ? parsed.timerEndsAt : null,
    timerRemainingMs:
      typeof parsed.timerRemainingMs === "number" ? parsed.timerRemainingMs : fallback.timerRemainingMs,
  };
}

const MAX_BOARD_PLAYERS = 128;
const MAX_BOARD_MATCHES = 400;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function optionalScore(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 9) return null;
  return value;
}

/** Network/database board. Drops malformed rows so a bad payload cannot crash the TV. */
export function coerceBoard(input: unknown): BoardState {
  const fallback = defaultBoard();
  if (!input || typeof input !== "object") return fallback;
  const parsed = input as Partial<BoardState>;
  const players = (Array.isArray(parsed.players) ? parsed.players : [])
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Partial<Player>;
      if (typeof row.id !== "string" || row.id.length === 0 || row.id.length > 80) return null;
      if (typeof row.name !== "string") return null;
      const name = row.name.trim().slice(0, 80);
      if (!name) return null;
      return { id: row.id, name, dropped: Boolean(row.dropped) };
    })
    .filter((row): row is Player => row != null)
    .slice(0, MAX_BOARD_PLAYERS);
  const known = new Set(players.map((player) => player.id));
  const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Partial<Match>;
      if (typeof row.id !== "string" || row.id.length === 0 || row.id.length > 80) return null;
      if (typeof row.aId !== "string" || !known.has(row.aId)) return null;
      if (row.bId != null && (typeof row.bId !== "string" || !known.has(row.bId))) return null;
      const round = Math.round(clampNumber(row.round, 1, 99, 0));
      const table = Math.round(clampNumber(row.table, 1, 99, 0));
      if (round === 0 || table === 0) return null;
      return {
        id: row.id,
        round,
        table,
        aId: row.aId,
        bId: row.bId ?? null,
        winsA: optionalScore(row.winsA),
        winsB: optionalScore(row.winsB),
      };
    })
    .filter((row): row is Match => row != null)
    .slice(0, MAX_BOARD_MATCHES);
  const roundMinutes = Math.round(clampNumber(parsed.roundMinutes, 1, 180, fallback.roundMinutes));
  const timerRemainingMs = Math.round(
    clampNumber(parsed.timerRemainingMs, 0, 180 * 60_000, roundMinutes * 60_000),
  );
  const timerEndsAt =
    typeof parsed.timerEndsAt === "number" && Number.isFinite(parsed.timerEndsAt) ? parsed.timerEndsAt : null;
  const timerRunning = Boolean(parsed.timerRunning) && timerEndsAt != null;
  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 120)
      : fallback.title;
  return {
    title,
    sessionNumber: cleanLine(parsed.sessionNumber, 40),
    sessionDate: cleanSessionDate(parsed.sessionDate),
    players,
    matches,
    roundMinutes,
    timerRunning,
    timerEndsAt: timerRunning ? timerEndsAt : null,
    timerRemainingMs,
  };
}

export function publishBoardInput(input: unknown, now = Date.now()) {
  return normalizeTimer(coerceBoard(input), now);
}

function emptyStore(): BoardStore {
  return { lastKey: "default", boards: {} };
}

function readStore(): BoardStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<BoardStore>;
    return {
      lastKey: typeof parsed.lastKey === "string" && parsed.lastKey ? parsed.lastKey : "default",
      boards: parsed.boards && typeof parsed.boards === "object" ? parsed.boards : {},
    };
  } catch {
    return emptyStore();
  }
}

export function loadLastBoardKey() {
  return readStore().lastKey || "default";
}

export function boardKeyFromSearch(params: URLSearchParams) {
  return params.get("board")?.trim() || params.get("slug")?.trim() || params.get("title")?.trim() || "";
}

export function liveBoardHref(
  event?: { slug?: string | null; title?: string | null },
  options?: { test?: boolean },
) {
  if (options?.test) {
    const params = new URLSearchParams({ board: SHOP_TEST_BOARD_KEY, title: "試賽" });
    return `/tournaments/live?${params.toString()}`;
  }
  const params = new URLSearchParams();
  if (event?.slug) params.set("slug", event.slug);
  if (event?.title) params.set("title", event.title);
  const query = params.toString();
  return query ? `/tournaments/live?${query}` : "/tournaments/live";
}

/** Staff choose a local practice board or the shared scoreboard and clock. */
export const STAFF_BOARD_LINKS = {
  test: { label: "試賽計分", href: liveBoardHref(undefined, { test: true }) },
  live: { label: "計分板 / 計時", href: "/pos/scoreboard" },
} as const;

export function testPlayers(): Player[] {
  return TEST_PLAYER_NAMES.map((name) => ({
    id: crypto.randomUUID(),
    name,
    dropped: false,
  }));
}

export function loadBoard(key = "default"): BoardState {
  if (typeof window === "undefined") return defaultBoard();
  const store = readStore();
  const found = store.boards[key];
  if (found) return sanitizeBoard(found);
  if (key === "default") {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) return sanitizeBoard(JSON.parse(raw) as Partial<BoardState>);
    } catch {
      // Ignore a corrupt older board and start clean.
    }
  }
  return defaultBoard();
}

export function saveBoard(state: BoardState, key = "default") {
  const store = readStore();
  store.lastKey = key || "default";
  store.boards[store.lastKey] = state;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  if (store.lastKey === "default") localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function parseClockInput(raw: string) {
  const text = raw.trim();
  if (!text) return null;
  const toMs = (minutes: number, seconds: number) => {
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds)) return null;
    if (minutes < 0 || minutes > 180 || seconds < 0 || seconds > 59) return null;
    return (minutes * 60 + seconds) * 1000;
  };
  if (text.includes(":")) {
    const [minutes, seconds = "0"] = text.split(":");
    return toMs(Number(minutes), Number(seconds));
  }
  if (!/^\d{1,4}$/.test(text)) return null;
  if (text.length <= 2) return toMs(Number(text), 0);
  return toMs(Number(text.slice(0, -2)), Number(text.slice(-2)));
}

export function addMinutesState(
  state: BoardState,
  minutes: number,
  typedMs: number | null,
  now = Date.now(),
): BoardState {
  const base =
    state.timerRunning && state.timerEndsAt != null
      ? Math.max(0, state.timerEndsAt - now)
      : typedMs != null
        ? typedMs
        : state.timerRemainingMs;
  const next = base + minutes * 60_000;
  return {
    ...state,
    timerRemainingMs: next,
    timerEndsAt: state.timerRunning ? now + next : null,
  };
}

export function startTimerState(state: BoardState, typedMs: number | null, now: number): BoardState {
  const left =
    typedMs != null
      ? typedMs
      : state.timerRemainingMs > 0
        ? state.timerRemainingMs
        : state.roundMinutes * 60_000;
  return {
    ...state,
    roundMinutes:
      typedMs != null && Math.floor(typedMs / 60_000) > 0
        ? Math.floor(typedMs / 60_000)
        : state.roundMinutes,
    timerRunning: true,
    timerRemainingMs: left,
    timerEndsAt: now + left,
  };
}

export function normalizeTimer(state: BoardState, now = Date.now()): BoardState {
  if (!state.timerRunning || state.timerEndsAt == null) return state;
  if (state.timerEndsAt - now <= 0) {
    return {
      ...state,
      timerRunning: false,
      timerEndsAt: null,
      timerRemainingMs: 0,
    };
  }
  return state;
}

export function latestRound(matches: Match[]) {
  return matches.reduce((max, match) => Math.max(max, match.round), 0);
}

export function roundMatches(matches: Match[], round: number) {
  return matches
    .filter((match) => match.round === round)
    .sort((a, b) => a.table - b.table);
}

export function roundComplete(matches: Match[], round: number) {
  const list = roundMatches(matches, round);
  return list.length > 0 && list.every((match) => match.winsA != null && match.winsB != null);
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function outcome(wins: number, opponentWins: number): "W" | "L" | "D" {
  if (wins > opponentWins) return "W";
  if (wins < opponentWins) return "L";
  return "D";
}

function matchPoints(result: "W" | "L" | "D") {
  if (result === "W") return 3;
  if (result === "D") return 1;
  return 0;
}

export function computeStandings(players: Player[], matches: Match[]): Standing[] {
  const seed = new Map(players.map((player, index) => [player.id, index]));
  const blank = () => ({
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    gameWins: 0,
    gameLosses: 0,
    opponents: [] as string[],
  });
  const rows = new Map(players.map((player) => [player.id, blank()]));

  for (const match of matches) {
    if (match.winsA == null || match.winsB == null) continue;
    const a = rows.get(match.aId);
    if (!a) continue;

    if (match.bId == null) {
      a.points += 3;
      a.wins += 1;
      a.gameWins += match.winsA;
      a.gameLosses += match.winsB;
      continue;
    }

    const b = rows.get(match.bId);
    if (!b) continue;
    const aResult = outcome(match.winsA, match.winsB);
    const bResult = outcome(match.winsB, match.winsA);
    a.points += matchPoints(aResult);
    b.points += matchPoints(bResult);
    if (aResult === "W") a.wins += 1;
    else if (aResult === "L") a.losses += 1;
    else a.draws += 1;
    if (bResult === "W") b.wins += 1;
    else if (bResult === "L") b.losses += 1;
    else b.draws += 1;
    a.gameWins += match.winsA;
    a.gameLosses += match.winsB;
    b.gameWins += match.winsB;
    b.gameLosses += match.winsA;
    a.opponents.push(match.bId);
    b.opponents.push(match.aId);
  }

  const MIN_RATE = 1 / 3;

  const matchWinRate = (id: string) => {
    const row = rows.get(id);
    if (!row) return 0;
    const played = row.wins + row.losses + row.draws;
    if (played === 0) return 0;
    return row.points / (played * 3);
  };

  const gameWinRate = (id: string) => {
    const row = rows.get(id);
    if (!row) return 0;
    const games = row.gameWins + row.gameLosses;
    if (games === 0) return 0;
    return row.gameWins / games;
  };

  const opponentAverage = (opponents: string[], rate: (id: string) => number) =>
    opponents.length
      ? opponents.reduce((sum, id) => sum + Math.max(rate(id), MIN_RATE), 0) / opponents.length
      : MIN_RATE;

  const standings: Standing[] = players.map((player) => {
    const row = rows.get(player.id) ?? blank();
    return {
      playerId: player.id,
      name: player.name,
      dropped: player.dropped,
      points: row.points,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      omw: opponentAverage(row.opponents, matchWinRate),
      gwp: gameWinRate(player.id),
      ogp: opponentAverage(row.opponents, gameWinRate),
    };
  });

  standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.omw - a.omw ||
      b.gwp - a.gwp ||
      b.ogp - a.ogp ||
      (seed.get(a.playerId) ?? 0) - (seed.get(b.playerId) ?? 0),
  );

  return standings;
}

function pairPlayers(players: Player[], played: Set<string>): [Player, Player][] {
  let nodes = 0;
  const search = (rest: Player[]): [Player, Player][] | null => {
    if (rest.length === 0) return [];
    if (nodes++ > 20000) return null;
    const [first, ...others] = rest;
    for (let index = 0; index < others.length; index += 1) {
      const opponent = others[index];
      if (played.has(pairKey(first.id, opponent.id))) continue;
      const next = others.filter((_, item) => item !== index);
      const paired = search(next);
      if (paired) return [[first, opponent], ...paired];
    }
    return null;
  };

  const strict = search(players);
  if (strict) return strict;

  const remaining = [...players];
  const pairs: [Player, Player][] = [];
  while (remaining.length > 1) {
    const first = remaining.shift();
    if (!first) break;
    let index = remaining.findIndex((player) => !played.has(pairKey(first.id, player.id)));
    if (index < 0) index = 0;
    const [opponent] = remaining.splice(index, 1);
    if (!opponent) break;
    pairs.push([first, opponent]);
  }
  return pairs;
}

export function canPair(state: BoardState) {
  const active = state.players.filter((player) => !player.dropped).length;
  if (active < 2) return false;
  const round = latestRound(state.matches);
  if (round === 0) return true;
  return roundComplete(state.matches, round);
}

export function createRound(state: BoardState): BoardState {
  if (!canPair(state)) return state;

  const round = latestRound(state.matches) + 1;
  const standings = computeStandings(state.players, state.matches);
  const order = new Map(standings.map((row, index) => [row.playerId, index]));
  const active = state.players
    .filter((player) => !player.dropped)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const played = new Set<string>();
  const hadBye = new Set<string>();
  for (const match of state.matches) {
    if (match.bId) played.add(pairKey(match.aId, match.bId));
    else hadBye.add(match.aId);
  }

  let pool = active;
  let bye: Player | null = null;
  if (pool.length % 2 === 1) {
    const byePlayer =
      [...pool].reverse().find((player) => !hadBye.has(player.id)) ?? pool[pool.length - 1];
    if (byePlayer) {
      bye = byePlayer;
      pool = pool.filter((player) => player.id !== byePlayer.id);
    }
  }

  const pairs = pairPlayers(pool, played);
  const matches: Match[] = pairs.map(([a, b], index) => ({
    id: crypto.randomUUID(),
    round,
    table: index + 1,
    aId: a.id,
    bId: b.id,
    winsA: null,
    winsB: null,
  }));

  if (bye) {
    matches.push({
      id: crypto.randomUUID(),
      round,
      table: matches.length + 1,
      aId: bye.id,
      bId: null,
      winsA: 2,
      winsB: 0,
    });
  }

  return { ...state, matches: [...state.matches, ...matches] };
}

export function undoRound(state: BoardState): BoardState {
  const round = latestRound(state.matches);
  if (round === 0) return state;
  return { ...state, matches: state.matches.filter((match) => match.round !== round) };
}

export function setMatchResult(
  state: BoardState,
  matchId: string,
  winsA: number,
  winsB: number,
): BoardState {
  return {
    ...state,
    matches: state.matches.map((match) =>
      match.id === matchId ? { ...match, winsA, winsB } : match,
    ),
  };
}

export function formatPct(value: number) {
  return (value * 100).toFixed(2);
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function playerName(players: Player[], id: string) {
  return players.find((player) => player.id === id)?.name ?? "已刪除";
}
