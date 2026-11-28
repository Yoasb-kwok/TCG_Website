import assert from "node:assert/strict";
import test from "node:test";
import { cartLineShowsCondition, showsProductCondition } from "./product-condition";

test("品相 is only for singles", () => {
  assert.equal(showsProductCondition("SINGLE"), true);
  for (const type of ["SEALED_BOX", "BOOSTER_PACK", "ACCESSORY", "GIFT_BOX", "FOOD", ""]) {
    assert.equal(showsProductCondition(type), false, type);
  }
});

test("cart lines hide sealed and new labels when the type was not stored", () => {
  assert.equal(cartLineShowsCondition({ condition: "Near Mint (NM)", productType: "SINGLE" }), true);
  assert.equal(cartLineShowsCondition({ condition: "Sealed", productType: "SEALED_BOX" }), false);
  assert.equal(cartLineShowsCondition({ condition: "New", productType: "FOOD" }), false);
  assert.equal(cartLineShowsCondition({ condition: "Sealed" }), false);
  assert.equal(cartLineShowsCondition({ condition: "Near Mint (NM)" }), true);
});
