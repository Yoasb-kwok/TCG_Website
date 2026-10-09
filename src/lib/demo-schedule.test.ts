import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_TOURNAMENTS } from "./demo-products";
import { formatDate } from "./format";

test("demo tournament times are fixed Hong Kong instants", () => {
  assert.equal(DEMO_TOURNAMENTS[0]?.startsAt, "2026-10-17T06:00:00.000Z");
  assert.equal(DEMO_TOURNAMENTS[0]?.registrationDeadline, "2026-10-16T15:59:00.000Z");
  assert.equal(DEMO_TOURNAMENTS[1]?.startsAt, "2026-10-24T06:00:00.000Z");
  assert.equal(DEMO_TOURNAMENTS[1]?.registrationDeadline, "2026-10-23T15:59:00.000Z");

  const first = formatDate(DEMO_TOURNAMENTS[0].startsAt);
  const second = formatDate(DEMO_TOURNAMENTS[1].startsAt);
  assert.equal(first, formatDate("2026-10-17T06:00:00.000Z"));
  assert.match(first, /2026/);
  assert.match(first, /14:00|下午2:00|下午 2:00/);
  assert.notEqual(first, second);
});
