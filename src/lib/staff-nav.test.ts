import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NAV_ITEMS } from "./constants";
import { CASHIER_SIDEBAR_LINKS, MERCHANT_SIDEBAR_LINKS, POS_TABS, STAFF_NAV_EXCLUDED } from "./staff-nav";

describe("merchant sidebar", () => {
  it("nests 商品名單 under 收銀帳務 and leaves 倉存 off the overview list", () => {
    const labels = MERCHANT_SIDEBAR_LINKS.map((link) => link.label) as string[];
    assert.equal(labels.includes("倉存"), false);
    assert.equal(labels.includes("商品名單"), false);
    assert.equal(labels[0], "總覽");
    assert.deepEqual(
      CASHIER_SIDEBAR_LINKS.map((link) => link.label),
      ["商品名單"],
    );
    assert.equal(CASHIER_SIDEBAR_LINKS[0]?.href, "/admin/products");
    for (const banned of STAFF_NAV_EXCLUDED) {
      assert.equal(labels.includes(banned), false, banned);
    }
    const posLabels = POS_TABS.map((tab) => tab.label) as string[];
    assert.equal(posLabels.includes("來貨"), false);
    assert.equal(posLabels.includes("倉存"), true);
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
