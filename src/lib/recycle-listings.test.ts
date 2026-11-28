import assert from "node:assert/strict";
import test from "node:test";
import { parseRecycleListings } from "./recycle-listings";

test("recycle listings need a card, a whole quantity, and a price", () => {
  const parsed = parseRecycleListings([
    { productId: "card-1", quantity: 2, price: 80 },
    { productId: "card-2", quantity: "4", price: "12.5", active: false },
  ]);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.listings, [
    { productId: "card-1", quantity: 2, price: 80, active: true },
    { productId: "card-2", quantity: 4, price: 12.5, active: false },
  ]);
});

test("duplicate cards and empty quantities are rejected", () => {
  assert.equal(
    parseRecycleListings([
      { productId: "card-1", quantity: 1, price: 10 },
      { productId: "card-1", quantity: 2, price: 10 },
    ]).ok,
    false,
  );
  assert.equal(parseRecycleListings([{ productId: "card-1", quantity: 0, price: 10 }]).ok, false);
  assert.equal(parseRecycleListings([{ productId: "", quantity: 1, price: 10 }]).ok, false);
});
