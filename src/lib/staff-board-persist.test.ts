import assert from "node:assert/strict";
import test from "node:test";
import { createStaffBoardPersist } from "./staff-board-persist";

test("a confirmed snapshot is not written again", () => {
  const persist = createStaffBoardPersist();
  persist.saved('{"title":"店賽"}');
  assert.equal(persist.dirty(), false);
  assert.equal(persist.peek(), null);
});

test("a newer edit stays pending until that exact snapshot is confirmed", () => {
  const persist = createStaffBoardPersist();
  persist.saved('{"timer":"25:00"}');
  persist.note('{"timer":"running"}');
  assert.equal(persist.peek(), '{"timer":"running"}');
  persist.note('{"timer":"paused"}');
  persist.ack('{"timer":"running"}');
  assert.equal(persist.dirty(), true);
  assert.equal(persist.peek(), '{"timer":"paused"}');
  persist.ack('{"timer":"paused"}');
  assert.equal(persist.dirty(), false);
  assert.equal(persist.peek(), null);
});
