import assert from "node:assert/strict";
import test from "node:test";
import { POS_CUES, playPosCue, posSoundEnabled, soundEnabledFromStorage } from "./pos-sfx";

test("sell cues stay short original beeps", () => {
  assert.deepEqual(POS_CUES.ok, { freq: 1180, ms: 100, gain: 0.05 });
  assert.deepEqual(POS_CUES.err, { freq: 320, ms: 240, gain: 0.05 });
  assert.ok(POS_CUES.ok.ms <= 120);
  assert.ok(POS_CUES.err.ms <= 260);
});

test("sound defaults on unless storage is pos:sound=off", () => {
  assert.equal(soundEnabledFromStorage(null), true);
  assert.equal(soundEnabledFromStorage("on"), true);
  assert.equal(soundEnabledFromStorage(""), true);
  assert.equal(soundEnabledFromStorage("off"), false);
});

test("playPosCue does nothing without a browser", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(posSoundEnabled(), true);
  assert.doesNotThrow(() => playPosCue("ok"));
  assert.doesNotThrow(() => playPosCue("err"));
});
