import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateShipping,
  FREE_SHIPPING_THRESHOLD,
  resolveShippingMethod,
  SHIPPING_FEE,
  shippingMethodLabel,
} from "./checkout";

test("prepaid shipping charges the local fee under the free-shipping threshold", () => {
  assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD - 1, "PREPAID"), SHIPPING_FEE);
  assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD, "PREPAID"), 0);
  assert.equal(calculateShipping(800, "PREPAID"), 0);
});

test("store pickup and courier cash-on-delivery do not add a checkout shipping fee", () => {
  assert.equal(calculateShipping(100, "PICKUP"), 0);
  assert.equal(calculateShipping(100, "COD"), 0);
  assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD, "COD"), 0);
});

test("resolveShippingMethod accepts pickup, prepaid, and 速遞到付", () => {
  assert.deepEqual(resolveShippingMethod({ shippingMethod: "cod" }), { ok: true, method: "COD" });
  assert.deepEqual(resolveShippingMethod({ shippingMethod: "PICKUP" }), { ok: true, method: "PICKUP" });
  assert.deepEqual(resolveShippingMethod({ shippingMethod: " PREPAID " }), {
    ok: true,
    method: "PREPAID",
  });
  assert.equal(shippingMethodLabel("COD"), "速遞到付");
  assert.equal(shippingMethodLabel("PICKUP"), "門市自取（免運費）");
  assert.equal(shippingMethodLabel("PREPAID"), "本地運費（順豐）");
});

test("resolveShippingMethod keeps the old pickup flag and rejects an unknown method", () => {
  assert.deepEqual(resolveShippingMethod({ pickup: true }), { ok: true, method: "PICKUP" });
  assert.deepEqual(resolveShippingMethod({ pickup: "1" }), { ok: true, method: "PICKUP" });
  assert.deepEqual(resolveShippingMethod({}), { ok: true, method: "PREPAID" });
  assert.deepEqual(resolveShippingMethod({ shippingMethod: "AIR" }), {
    ok: false,
    error: "請選擇送貨方式",
  });
});
