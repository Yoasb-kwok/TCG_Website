import assert from "node:assert/strict";
import test from "node:test";
import { STORE } from "./constants";
import { getStoreMapsUrl } from "./store-maps";

test("store pin opens a Google Maps search for the configured building", () => {
  const url = new URL(getStoreMapsUrl("Kowloon Bay Industrial Centre"));
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), "Kowloon Bay Industrial Centre");
});

test("default query matches the storefront map query", () => {
  const url = new URL(getStoreMapsUrl());
  assert.equal(url.searchParams.get("query"), STORE.mapQuery);
});
