import assert from "node:assert/strict";
import test from "node:test";
import { googleCalendarUrl, tournamentCalendarUrl } from "./format";

const future = "2026-10-17T06:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";
const now = new Date("2026-10-12T00:00:00.000Z");

test("googleCalendarUrl encodes title, location, and Hong Kong timezone", () => {
  const url = googleCalendarUrl({
    title: "標準賽 & 新手 #1",
    startsAt: future,
    location: "旺角店",
    description: "瑞士輪",
    format: "Standard",
  });
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(parsed.searchParams.get("action"), "TEMPLATE");
  assert.equal(parsed.searchParams.get("text"), "標準賽 & 新手 #1");
  assert.equal(parsed.searchParams.get("location"), "旺角店");
  assert.equal(parsed.searchParams.get("ctz"), "Asia/Hong_Kong");
  assert.match(parsed.searchParams.get("details") ?? "", /賽制：Standard/);
  assert.match(parsed.searchParams.get("details") ?? "", /瑞士輪/);
  assert.equal(parsed.searchParams.get("dates"), "20261017T060000Z/20261017T090000Z");
});

test("googleCalendarUrl returns null for bad dates", () => {
  assert.equal(googleCalendarUrl({ title: "賽事", startsAt: "not-a-date", location: "店" }), null);
  assert.equal(googleCalendarUrl({ title: "賽事", startsAt: "", location: "店" }), null);
});

test("tournamentCalendarUrl hides past, completed, cancelled, and bad dates", () => {
  const base = {
    title: "週六標準賽",
    location: "旺角店",
    description: null,
    format: "Standard",
  };
  assert.ok(tournamentCalendarUrl({ ...base, startsAt: future, status: "OPEN" }, now));
  assert.equal(tournamentCalendarUrl({ ...base, startsAt: past, status: "OPEN" }, now), null);
  assert.equal(
    tournamentCalendarUrl({ ...base, startsAt: future, status: "COMPLETED" }, now),
    null,
  );
  assert.equal(
    tournamentCalendarUrl({ ...base, startsAt: future, status: "CANCELLED" }, now),
    null,
  );
  assert.equal(
    tournamentCalendarUrl({ ...base, startsAt: "bad", status: "OPEN" }, now),
    null,
  );
  assert.ok(tournamentCalendarUrl({ ...base, startsAt: future, status: "FULL" }, now));
});
