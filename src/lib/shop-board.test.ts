import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import test from "node:test";
import { fileShopBoard, memoryShopBoard } from "./shop-board";
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
  assert.equal(published.timerEndsAt, now + 50 * 60_000);
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
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
