import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEMBER_RATE_UNSET,
  chargedUnitPrice,
  commercialFacts,
  memberRateUnset,
  readExtendedBarcode,
  saleUnitCost,
  scanAddedText,
  usableMemberPrice,
} from "./pos-commercial";

describe("saleUnitCost", () => {
  it("uses catalog cost only when it is above zero", () => {
    assert.equal(saleUnitCost({ cost: 32 }), 32);
    assert.equal(saleUnitCost({ cost: 12.5 }), 12.5);
    assert.equal(saleUnitCost({ cost: 0 }), 0);
    assert.equal(saleUnitCost({ cost: null }), 0);
    assert.equal(saleUnitCost({}), 0);
    assert.equal(saleUnitCost(null), 0);
  });
});

describe("member price", () => {
  it("keeps retail and does not invent a rate when the flag is on but member price is not above zero", () => {
    const variant = { price: 55, memberDiscount: true, memberPrice: 0, pointsProduct: true };
    assert.equal(chargedUnitPrice(variant), 55);
    assert.equal(usableMemberPrice(variant), null);
    assert.equal(memberRateUnset(variant), true);
    const facts = commercialFacts(variant);
    assert.equal(facts.includes(MEMBER_RATE_UNSET), true);
    assert.equal(facts.some((fact) => fact.startsWith("會員價")), false);
    assert.equal(facts.includes("會員折扣 是"), true);
    assert.equal(facts.includes("積分商品 是"), true);
  });

  it("uses an absolute member price only when it is above zero", () => {
    const variant = { price: 80, memberDiscount: true, memberPrice: 68, wholesalePrice: 70, cost: 50 };
    assert.equal(chargedUnitPrice(variant), 80);
    assert.equal(usableMemberPrice(variant), 68);
    assert.equal(memberRateUnset(variant), false);
    const facts = commercialFacts(variant).join(" · ");
    assert.match(facts, /進貨/);
    assert.match(facts, /批發/);
    assert.match(facts, /會員價/);
    assert.equal(facts.includes(MEMBER_RATE_UNSET), false);
  });

  it("does not treat a false flag with no member price as a missing rate", () => {
    assert.equal(memberRateUnset({ memberDiscount: false, memberPrice: 0 }), false);
    assert.equal(commercialFacts({ memberDiscount: false }).includes("會員折扣 否"), true);
    assert.equal(commercialFacts({}).includes("積分商品 否"), true);
  });
});

describe("scan note", () => {
  it("names stock, the points flag, and an unconfigured member rate", () => {
    const text = scanAddedText("卡套", {
      stock: 4,
      price: 20,
      memberDiscount: true,
      memberPrice: 0,
      pointsProduct: true,
    });
    assert.match(text, /^已加入：卡套（/);
    assert.match(text, /庫存 4/);
    assert.match(text, /積分商品/);
    assert.match(text, /折扣率未設定，沿用售價/);
    assert.equal(scanAddedText("空盒", { stock: 0, price: 10 }).includes("而家無庫存"), true);
  });
});

describe("readExtendedBarcode", () => {
  it("reads the tentative field and ignores variants that do not have it", () => {
    assert.equal(readExtendedBarcode({ extendedBarcode: " 4890000000099 " }), "4890000000099");
    assert.equal(readExtendedBarcode({ barcode: "4890000000001" }), null);
    assert.equal(readExtendedBarcode({ extendedBarcode: "" }), null);
    assert.equal(readExtendedBarcode(null), null);
  });
});
