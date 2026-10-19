import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POS_TABS } from "./staff-nav";
import {
  DEMO_CART_STORAGE_KEY,
  DEMO_SHOP,
  DEMO_WRITE_DISCLAIMER,
  demoPosPath,
  demoShopStats,
  demoSurface,
  demoTrialWhatsAppHref,
  demoWriteBody,
  filterDemoCatalog,
  isDemoAuthBypassPath,
  isDemoPosDesk,
} from "./demo-shop";

describe("demo auth bypass", () => {
  it("opens only the demo admin and demo POS prefixes", () => {
    assert.equal(isDemoAuthBypassPath("/admin/demo"), true);
    assert.equal(isDemoAuthBypassPath("/admin/demo/products"), true);
    assert.equal(isDemoAuthBypassPath("/pos/demo"), true);
    assert.equal(isDemoAuthBypassPath("/pos/demo/receiving"), true);
    assert.equal(isDemoAuthBypassPath("/admin"), false);
    assert.equal(isDemoAuthBypassPath("/admin/products"), false);
    assert.equal(isDemoAuthBypassPath("/admin/demox"), false);
    assert.equal(isDemoAuthBypassPath("/pos"), false);
    assert.equal(isDemoAuthBypassPath("/pos/orders"), false);
    assert.equal(isDemoAuthBypassPath("/demo"), false);
  });
});

describe("demo surfaces", () => {
  it("maps the three public desks", () => {
    assert.equal(demoSurface("/demo"), "store");
    assert.equal(demoSurface("/demo/checkout"), "store");
    assert.equal(demoSurface("/admin/demo/orders"), "admin");
    assert.equal(demoSurface("/pos/demo"), "pos");
  });

  it("keeps POS sell on /pos/demo and prefixes the other tabs", () => {
    assert.equal(demoPosPath("/pos"), "/pos/demo");
    assert.equal(demoPosPath("/pos/receiving"), "/pos/demo/receiving");
    for (const tab of POS_TABS) {
      const href = demoPosPath(tab.href);
      assert.equal(href === "/pos/demo" || href.startsWith("/pos/demo/"), true);
      assert.equal(isDemoPosDesk(href.slice("/pos/demo/".length)) || href === "/pos/demo", true);
    }
  });
});

describe("demo shop copy", () => {
  it("uses the fictional Mong Kok address and the write disclaimer", () => {
    assert.equal(DEMO_SHOP.name, "旺角示範卡店");
    assert.equal(DEMO_SHOP.address.zh, "旺角西洋菜南街 128 號 3 樓");
    assert.equal(demoWriteBody().error, DEMO_WRITE_DISCLAIMER);
    assert.equal(DEMO_WRITE_DISCLAIMER, "示範店唔會儲存任何改動");
    assert.equal(DEMO_CART_STORAGE_KEY, "tcg-hk-demo-cart");
  });

  it("builds a TCGHK trial WhatsApp link from the shop number", () => {
    const href = demoTrialWhatsAppHref("https://wa.me/85266094893");
    assert.ok(href);
    const url = new URL(href!);
    assert.equal(url.origin + url.pathname, "https://wa.me/85266094893");
    assert.match(url.searchParams.get("text") ?? "", /TCGHK/);
    assert.equal((href ?? "").toLowerCase().includes("cardkura"), false);
  });
});

describe("demo catalog", () => {
  it("searches the seeded products without a database", () => {
    assert.equal(filterDemoCatalog({ search: "charizard" }).length, 1);
    assert.equal(filterDemoCatalog({ search: "4891511990001" })[0]?.slug, "charizard-ex-151");
    assert.equal(filterDemoCatalog({ type: "SEALED_BOX" }).length, 1);
    const stats = demoShopStats();
    assert.equal(stats.products > 0, true);
    assert.equal(stats.lowStock > 0, true);
    assert.equal(stats.orders, 2);
  });
});
