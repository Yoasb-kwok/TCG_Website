import assert from "node:assert/strict";
import test from "node:test";
import {
  addMinutesState,
  canPair,
  computeStandings,
  createRound,
  defaultBoard,
  liveBoardHref,
  parseClockInput,
  roundComplete,
  setMatchResult,
  startTimerState,
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

test("live board links keep a test sandbox separate from an event", () => {
  assert.equal(liveBoardHref(), "/tournaments/live");
  assert.equal(
    liveBoardHref({ slug: "standard-sat-12", title: "週六標準賽" }),
    "/tournaments/live?slug=standard-sat-12&title=%E9%80%B1%E5%85%AD%E6%A8%99%E6%BA%96%E8%B3%BD",
  );
  assert.equal(liveBoardHref(undefined, { test: true }), "/tournaments/live?board=shop-test&title=%E8%A9%A6%E8%B3%BD");
});
