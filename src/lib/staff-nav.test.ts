import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NAV_ITEMS } from "./constants";
import { MERCHANT_SIDEBAR_LINKS, POS_TABS, STAFF_NAV_EXCLUDED } from "./staff-nav";

describe("merchant sidebar", () => {
  it("labels inventory as 倉存 and leaves out member, points, and coupon menus", () => {
    const labels = MERCHANT_SIDEBAR_LINKS.map((link) => link.label) as string[];
    const inventory = MERCHANT_SIDEBAR_LINKS.find((link) => link.label === "倉存");
    assert.equal(inventory?.href, "/pos/receiving");
    for (const banned of STAFF_NAV_EXCLUDED) {
      assert.equal(labels.includes(banned), false, banned);
    }
    const posLabels = POS_TABS.map((tab) => tab.label) as string[];
    assert.equal(posLabels.includes("來貨"), false);
  });
});

describe("pos tabs", () => {
  it("opens the stock screen as 倉存", () => {
    const stock = POS_TABS.find((tab) => tab.id === "receiving");
    assert.equal(stock?.label, "倉存");
    assert.equal(stock?.href, "/pos/receiving");
  });
});

describe("storefront nav parity", () => {
  it("keeps the shop links the buyback desk reuses", () => {
    assert.deepEqual(
      NAV_ITEMS.map((item) => item.label),
      ["商品", "最新預訂", "店賽", "關於我們", "送貨方式", "付款方式"],
    );
    assert.deepEqual(
      NAV_ITEMS.map((item) => item.href),
      ["/products", "/products?type=SEALED_BOX", "/tournaments", "/about", "/shipping", "/payment"],
    );
  });
});
