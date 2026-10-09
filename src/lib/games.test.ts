import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedCatalogGame,
  productMatchesGame,
} from "./games";

test("one-piece and lorcana are not treated as the Pokémon catalog", () => {
  assert.equal(isSupportedCatalogGame("one-piece"), false);
  assert.equal(isSupportedCatalogGame("lorcana"), false);
  assert.equal(isSupportedCatalogGame("pokemon"), true);
  assert.equal(isSupportedCatalogGame(null), true);
  assert.equal(isSupportedCatalogGame("digimon"), false);
});

test("products without a game belong to Pokémon only", () => {
  assert.equal(productMatchesGame(undefined, "pokemon"), true);
  assert.equal(productMatchesGame(undefined, "one-piece"), false);
  assert.equal(productMatchesGame(undefined, "lorcana"), false);
  assert.equal(productMatchesGame("one-piece", "one-piece"), true);
  assert.equal(productMatchesGame(null, undefined), true);
});
