import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import test from "node:test";
import { fileShopBoard, memoryShopBoard, nextShopBoard } from "./shop-board";
import { defaultBoard, publishBoardInput, startTimerState } from "./tournament-board";

test("publishBoardInput keeps a running countdown and drops a broken roster", () => {
  const now = 5_000_000;
  const started = startTimerState(defaultBoard(), null, now);
  const published = publishBoardInput(
    {
      ...started,
      title: "  Fun Day  ",
      players: [
        { id: "a", name: " 小明 ", dropped: false },
        { name: "no id" },
        { id: "b", name: "小華", dropped: true },
      ],
      matches: [
        { id: "m1", round: 1, table: 1, aId: "a", bId: "b", winsA: 2, winsB: 1 },
        { id: "m2", round: 1, table: 2, aId: "missing", bId: "a", winsA: 2, winsB: 0 },
      ],
    },
    now + 1_000,
  );
  assert.equal(published.title, "Fun Day");
  assert.equal(published.timerRunning, true);
  assert.equal(published.timerEndsAt, now + 25 * 60_000);
  assert.deepEqual(
    published.players.map((player) => player.name),
    ["小明", "小華"],
  );
  assert.equal(published.matches.length, 1);
  assert.equal(published.matches[0]?.winsA, 2);
});

test("an expired absolute end time is stored as stopped at zero", () => {
  const now = 9_000;
  const stopped = publishBoardInput(
    {
      ...defaultBoard(),
      timerRunning: true,
      timerEndsAt: now - 10,
      timerRemainingMs: 10,
    },
    now,
  );
  assert.equal(stopped.timerRunning, false);
  assert.equal(stopped.timerEndsAt, null);
  assert.equal(stopped.timerRemainingMs, 0);
});

test("reload keeps a running end time instead of the original preset", () => {
  const startedAt = Date.now();
  const saved = nextShopBoard(
    defaultBoard(),
    {
      ...startTimerState(
        { ...defaultBoard(), title: "店賽夜", sessionNumber: "7", sessionDate: "2026-10-22" },
        25 * 60_000,
        startedAt,
      ),
      issuedAt: startedAt,
    },
    startedAt,
  );
  assert.ok(saved);
  const later = startedAt + 90_000;
  const reloaded = publishBoardInput(saved, later);
  assert.equal(reloaded.timerRunning, true);
  assert.equal(reloaded.timerEndsAt, startedAt + 25 * 60_000);
  assert.equal((reloaded.timerEndsAt ?? 0) - later, 25 * 60_000 - 90_000);
  assert.equal(reloaded.sessionNumber, "7");
  assert.equal(reloaded.sessionDate, "2026-10-22");
  assert.equal(reloaded.title, "店賽夜");
  assert.equal(reloaded.issuedAt, startedAt);
});

test("an older staff save does not rewind the clock or session settings", () => {
  const now = Date.now();
  const running = nextShopBoard(
    defaultBoard(),
    { ...startTimerState(defaultBoard(), 10 * 60_000, now), issuedAt: now + 5_000, sessionNumber: "3" },
    now,
  );
  assert.ok(running);
  assert.equal(nextShopBoard(running, { ...defaultBoard(), issuedAt: now + 1_000 }, now + 6_000), null);
  const paused = nextShopBoard(
    running,
    {
      ...running,
      timerRunning: false,
      timerEndsAt: null,
      timerRemainingMs: 60_000,
      issuedAt: now + 8_000,
    },
    now + 6_000,
  );
  assert.ok(paused);
  assert.equal(paused.timerRunning, false);
  assert.equal(paused.timerRemainingMs, 60_000);
  assert.equal(paused.sessionNumber, "3");
  assert.equal(paused.issuedAt, now + 8_000);
});

test("memory and file stores round-trip the same board", async () => {
  const now = Date.now();
  const board = publishBoardInput(
    {
      ...startTimerState({ ...defaultBoard(), title: "Fun Day" }, 30 * 60_000, now),
      players: [{ id: "p1", name: "Ada", dropped: false }],
    },
    now,
  );
  const memory = memoryShopBoard();
  await memory.write(board);
  assert.equal((await memory.read()).title, "Fun Day");
  assert.equal((await memory.read()).timerRunning, true);

  const dir = await mkdtemp(path.join(tmpdir(), "shop-board-"));
  try {
    const file = fileShopBoard(path.join(dir, "board.json"));
    await file.write(board);
    const raw = await readFile(path.join(dir, "board.json"), "utf8");
    assert.equal(JSON.parse(raw).board.title, "Fun Day");
    assert.equal((await file.read()).players[0]?.name, "Ada");
    assert.equal((await file.read()).timerRemainingMs, 30 * 60_000);
    assert.equal((await file.read()).sessionNumber, "");
    assert.equal((await file.read()).sessionDate, "");

    const legacyPath = path.join(dir, "legacy.json");
    await writeFile(
      legacyPath,
      JSON.stringify({
        board: {
          title: "店賽",
          players: [
            { id: "a", name: "Player A", dropped: false },
            { id: "b", name: "Player B", dropped: false },
          ],
          matches: [{ id: "m", round: 1, table: 1, aId: "a", bId: "b", winsA: 2, winsB: 0 }],
          roundMinutes: 50,
          timerRunning: false,
          timerEndsAt: null,
          timerRemainingMs: 50 * 60_000,
        },
      }),
      "utf8",
    );
    const legacy = await fileShopBoard(legacyPath).read();
    assert.equal(legacy.roundMinutes, 25);
    assert.equal(legacy.timerRemainingMs, 25 * 60_000);
    assert.equal(legacy.players.length, 2);
    assert.equal(legacy.matches[0]?.winsA, 2);

    const chosenPath = path.join(dir, "chosen.json");
    const chosen = fileShopBoard(chosenPath);
    await chosen.write({
      ...defaultBoard(),
      roundMinutes: 50,
      timerRemainingMs: 50 * 60_000,
      timerChosen: true,
    });
    assert.equal((await chosen.read()).roundMinutes, 50);
    assert.equal((await chosen.read()).timerRemainingMs, 50 * 60_000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
