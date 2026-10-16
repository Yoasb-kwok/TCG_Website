import assert from "node:assert/strict";
import test from "node:test";
import {
  addMinutesState,
  canPair,
  computeStandings,
  createRound,
  DEFAULT_ROUND_MINUTES,
  defaultBoard,
  formatSessionDate,
  FRONT_OVERLAY,
  liveBoardHref,
  matchScoreLabel,
  parseClockInput,
  publishBoardInput,
  roundComplete,
  SCORE_PRESETS,
  scoreButtonText,
  setMatchResult,
  STAFF_BOARD_LINKS,
  startTimerState,
  TIMER_PRESETS_MINUTES,
  undoRound,
  type Player,
} from "./tournament-board";

function players(names: string[]): Player[] {
  return names.map((name) => ({ id: name, name, dropped: false }));
}

function boardWith(names: string[]) {
  return { ...defaultBoard(), players: players(names) };
}

test("parseClockInput accepts shop clock formats and rejects bad times", () => {
  assert.equal(parseClockInput("45:00"), 45 * 60_000);
  assert.equal(parseClockInput("1:30"), 90_000);
  assert.equal(parseClockInput("4500"), 45 * 60_000);
  assert.equal(parseClockInput("45"), 45 * 60_000);
  assert.equal(parseClockInput("180:00"), 180 * 60_000);
  assert.equal(parseClockInput("00:30"), 30_000);
  assert.equal(parseClockInput("181:00"), null);
  assert.equal(parseClockInput("45:60"), null);
  assert.equal(parseClockInput("abc"), null);
  assert.equal(parseClockInput(""), null);
});

test("startTimerState uses a typed clock before the countdown starts", () => {
  const now = 1_000_000;
  const started = startTimerState(defaultBoard(), 90_000, now);
  assert.equal(started.timerRunning, true);
  assert.equal(started.timerRemainingMs, 90_000);
  assert.equal(started.timerEndsAt, now + 90_000);
  assert.equal(started.roundMinutes, 1);

  const fromRemaining = startTimerState(
    { ...defaultBoard(), timerRemainingMs: 25 * 60_000, roundMinutes: 50 },
    null,
    now,
  );
  assert.equal(fromRemaining.timerRemainingMs, 25 * 60_000);
  assert.equal(fromRemaining.roundMinutes, 50);
});

test("adding a minute uses a typed clock while the timer is paused", () => {
  const next = addMinutesState(defaultBoard(), 1, 20 * 60_000, 5_000);
  assert.equal(next.timerRunning, false);
  assert.equal(next.timerRemainingMs, 21 * 60_000);
  assert.equal(next.timerEndsAt, null);
});

test("scoring a match updates standings and blocks the next round until every table is in", () => {
  const paired = createRound(boardWith(["小明", "小華"]));
  assert.equal(canPair(paired), false);
  assert.equal(paired.matches.length, 1);
  const scored = setMatchResult(paired, paired.matches[0].id, 2, 0);
  assert.equal(roundComplete(scored.matches, 1), true);
  assert.equal(canPair(scored), true);
  const standings = computeStandings(scored.players, scored.matches);
  assert.deepEqual(
    standings.map((row) => [row.name, row.points, row.wins, row.losses]),
    [
      ["小明", 3, 1, 0],
      ["小華", 0, 0, 1],
    ],
  );
});

test("the next round avoids pairing the same players again", () => {
  const roundOne = createRound(boardWith(["A", "B", "C", "D"]));
  assert.equal(roundOne.matches.length, 2);
  let state = roundOne;
  for (const match of roundOne.matches) {
    state = setMatchResult(state, match.id, 2, 1);
  }
  const roundTwo = createRound(state);
  const pairs = (matches: typeof roundTwo.matches, round: number) =>
    matches
      .filter((match) => match.round === round && match.bId)
      .map((match) => [match.aId, match.bId].sort().join("|"))
      .sort();
  const first = new Set(pairs(roundOne.matches, 1));
  assert.equal(pairs(roundTwo.matches, 2).length, 2);
  for (const pair of pairs(roundTwo.matches, 2)) {
    assert.equal(first.has(pair), false);
  }
  const undone = undoRound(roundTwo);
  assert.equal(undone.matches.length, roundOne.matches.length);
});

test("three players produce one scored bye", () => {
  const state = createRound(boardWith(["A", "B", "C"]));
  const bye = state.matches.find((match) => match.bId == null);
  assert.ok(bye);
  assert.equal(bye?.winsA, 2);
  assert.equal(bye?.winsB, 0);
  const open = state.matches.filter((match) => match.bId && match.winsA == null);
  assert.equal(open.length, 1);
  assert.equal(canPair(state), false);
});

test("a new session uses the 25 minute pre-time and still offers 50, 30, and 25", () => {
  const board = defaultBoard();
  assert.equal(DEFAULT_ROUND_MINUTES, 25);
  assert.equal(board.roundMinutes, 25);
  assert.equal(board.timerRemainingMs, 25 * 60_000);
  assert.equal(board.timerChosen, false);
  assert.deepEqual([...TIMER_PRESETS_MINUTES], [50, 30, 25]);
});

test("first load of a stored 50:00 shop default shows 25:00 and keeps the roster", () => {
  const published = publishBoardInput({
    title: "店賽",
    sessionNumber: "",
    sessionDate: "",
    players: [
      { id: "a", name: "Player A", dropped: false },
      { id: "b", name: "Player B", dropped: false },
    ],
    matches: [{ id: "m", round: 1, table: 1, aId: "a", bId: "b", winsA: 2, winsB: 0 }],
    roundMinutes: 50,
    timerRunning: false,
    timerEndsAt: null,
    timerRemainingMs: 50 * 60_000,
  });
  assert.equal(published.roundMinutes, 25);
  assert.equal(published.timerRemainingMs, 25 * 60_000);
  assert.equal(published.timerRunning, false);
  assert.equal(published.timerEndsAt, null);
  assert.equal(published.players.length, 2);
  assert.equal(published.matches[0]?.winsA, 2);
});

test("the 50 minute preset stays 50:00 once staff choose it", () => {
  const chosen = publishBoardInput({
    ...defaultBoard(),
    roundMinutes: 50,
    timerRemainingMs: 50 * 60_000,
    timerChosen: true,
  });
  assert.equal(chosen.roundMinutes, 50);
  assert.equal(chosen.timerRemainingMs, 50 * 60_000);
  assert.equal(chosen.timerChosen, true);

  const paused = publishBoardInput({
    ...defaultBoard(),
    roundMinutes: 50,
    timerRemainingMs: 40 * 60_000,
  });
  assert.equal(paused.roundMinutes, 50);
  assert.equal(paused.timerRemainingMs, 40 * 60_000);

  const now = 8_000;
  const running = publishBoardInput(
    {
      ...defaultBoard(),
      roundMinutes: 50,
      timerRemainingMs: 50 * 60_000,
      timerRunning: true,
      timerEndsAt: now + 50 * 60_000,
    },
    now,
  );
  assert.equal(running.timerRunning, true);
  assert.equal(running.roundMinutes, 50);
  assert.equal(running.timerEndsAt, now + 50 * 60_000);
});

test("session settings keep 場次編號, 主題, and a real date", () => {
  const published = publishBoardInput({
    ...defaultBoard(),
    title: "  Pokémon TCG Gym Battle  ",
    sessionNumber: "  3  ",
    sessionDate: "2026-10-16",
  });
  assert.equal(published.title, "Pokémon TCG Gym Battle");
  assert.equal(published.sessionNumber, "3");
  assert.equal(published.sessionDate, "2026-10-16");
  assert.equal(formatSessionDate(published.sessionDate), "2026年10月16日");

  const rejected = publishBoardInput({
    ...defaultBoard(),
    sessionDate: "2026-13-40",
    sessionNumber: "場".repeat(50),
  });
  assert.equal(rejected.sessionDate, "");
  assert.equal(rejected.sessionNumber.length, 40);
});

test("score presets list 0-0 separately from a draw, in the default order", () => {
  assert.deepEqual(
    SCORE_PRESETS.slice(0, 5).map((preset) => preset.id),
    ["2-0", "2-1", "1-0", "0-0", "draw"],
  );
  const zero = SCORE_PRESETS.find((preset) => preset.id === "0-0");
  const draw = SCORE_PRESETS.find((preset) => preset.id === "draw");
  assert.ok(zero);
  assert.ok(draw);
  assert.deepEqual(scoreButtonText(zero, "Regan", "Tony"), { primary: "0–0", secondary: "" });
  assert.deepEqual(scoreButtonText(draw, "Regan", "Tony"), { primary: "和局", secondary: "1–1" });
  assert.equal(scoreButtonText(SCORE_PRESETS[2], "Regan", "Tony").secondary, "Regan 勝");
  assert.equal(matchScoreLabel({ bId: "b", winsA: 0, winsB: 0 }), "0–0");
  assert.equal(matchScoreLabel({ bId: "b", winsA: 1, winsB: 1 }), "和");
  assert.equal(matchScoreLabel({ bId: "b", winsA: 2, winsB: 0 }), "2–0");
});

test("a recorded 0-0 finishes the table and scores as a draw", () => {
  const paired = createRound(boardWith(["Regan", "Tony"]));
  const scored = setMatchResult(paired, paired.matches[0].id, 0, 0);
  assert.equal(roundComplete(scored.matches, 1), true);
  const standings = computeStandings(scored.players, scored.matches);
  assert.deepEqual(
    standings.map((row) => [row.points, row.draws, row.wins]),
    [
      [1, 1, 0],
      [1, 1, 0],
    ],
  );
});

test("the public front overlay hides top and bottom chrome images", () => {
  assert.equal(FRONT_OVERLAY.showTopImage, false);
  assert.equal(FRONT_OVERLAY.showBottomImage, false);
});

test("staff entry keeps 試賽計分 separate from 計分板 / 計時", () => {
  assert.equal(STAFF_BOARD_LINKS.test.label, "試賽計分");
  assert.equal(STAFF_BOARD_LINKS.live.label, "計分板 / 計時");
  assert.equal(STAFF_BOARD_LINKS.test.href, liveBoardHref(undefined, { test: true }));
  assert.equal(STAFF_BOARD_LINKS.live.href, "/pos/scoreboard");
  assert.notEqual(STAFF_BOARD_LINKS.test.href, STAFF_BOARD_LINKS.live.href);
});

test("live board links keep a test sandbox separate from an event", () => {
  assert.equal(liveBoardHref(), "/tournaments/live");
  assert.equal(
    liveBoardHref({ slug: "standard-sat-12", title: "週六標準賽" }),
    "/tournaments/live?slug=standard-sat-12&title=%E9%80%B1%E5%85%AD%E6%A8%99%E6%BA%96%E8%B3%BD",
  );
  assert.equal(liveBoardHref(undefined, { test: true }), "/tournaments/live?board=shop-test&title=%E8%A9%A6%E8%B3%BD");
});
