import assert from "node:assert/strict";
import test from "node:test";
import { STORE } from "./constants";
import { getStoreMapEmbedUrl, getStoreMapsUrl } from "./store-maps";

test("store pin opens a Google Maps search for the configured building", () => {
  const url = new URL(getStoreMapsUrl("Kowloon Bay Industrial Centre"));
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), "Kowloon Bay Industrial Centre");
});

test("default query matches the published storefront address", () => {
  assert.equal(STORE.address.zh, "九龍灣工業中心7樓28室");
  assert.equal(STORE.address.en, "Kowloon Bay Industrial Centre, 7/F Room 28");
  assert.equal(STORE.mapQuery, "Kowloon Bay Industrial Centre Room 28 7/F Hong Kong");

  const url = new URL(getStoreMapsUrl());
  assert.equal(url.searchParams.get("query"), STORE.mapQuery);

  const embed = new URL(getStoreMapEmbedUrl());
  assert.equal(embed.origin + embed.pathname, "https://www.google.com/maps");
  assert.equal(embed.searchParams.get("q"), STORE.mapQuery);
  assert.equal(embed.searchParams.get("hl"), "zh-HK");
  assert.equal(embed.searchParams.get("output"), "embed");
});
