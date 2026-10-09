import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  optionMatchesSearch,
  productMatchesSearch,
  productSearchNeedles,
  productSearchOr,
} from "./product-search";

const pikachu = {
  name: "皮卡丘",
  description: "M2 · #083/101",
  cardSet: "超級進化",
  cardNumber: "083/101",
  setCode: "M2",
  rarity: "RR",
  rarityTier: "RR",
  externalCardId: "m2-83",
  variants: [{ sku: "m2-083-101-nm", barcode: "4891234567890" }],
};

describe("productSearchNeedles", () => {
  it("normalizes card-number punctuation and padding", () => {
    assert.deepEqual(productSearchNeedles("  #083 / 101 "), ["#083 / 101", "083 / 101", "083/101", "83/101"]);
    assert.ok(productSearchNeedles("083-101").includes("083/101"));
    assert.ok(productSearchNeedles("83/101").includes("083/101"));
    assert.deepEqual(productSearchNeedles("   "), []);
  });
});

describe("productMatchesSearch", () => {
  it("matches name, set, set code, and sku", () => {
    assert.equal(productMatchesSearch(pikachu, "皮卡丘"), true);
    assert.equal(productMatchesSearch(pikachu, "超級"), true);
    assert.equal(productMatchesSearch(pikachu, "m2"), true);
    assert.equal(productMatchesSearch(pikachu, "M2-083-101-NM"), true);
  });

  it("matches card numbers staff actually type", () => {
    for (const query of ["083/101", "#083/101", "083-101", "083 / 101", "083", "83", "101", "83/101"]) {
      assert.equal(productMatchesSearch(pikachu, query), true, query);
    }
  });

  it("matches a padded query against an unpadded stored number", () => {
    assert.equal(productMatchesSearch({ ...pikachu, cardNumber: "83/101" }, "083/101"), true);
  });

  it("matches barcode when the variant has one", () => {
    assert.equal(productMatchesSearch(pikachu, "4891234567890"), true);
  });

  it("rejects an unrelated name", () => {
    assert.equal(productMatchesSearch(pikachu, "噴火龍"), false);
  });

  it("treats a blank query as match-all", () => {
    assert.equal(productMatchesSearch(pikachu, "  "), true);
  });
});

describe("productSearchOr", () => {
  it("includes card number and sku clauses", () => {
    const clauses = productSearchOr("083/101");
    assert.ok(clauses.some((clause) => "cardNumber" in clause));
    assert.ok(clauses.some((clause) => "setCode" in clause));
    assert.ok(clauses.some((clause) => "name" in clause));
    assert.ok(
      clauses.some(
        (clause) =>
          clause.variants != null &&
          typeof clause.variants === "object" &&
          "some" in clause.variants,
      ),
    );
    assert.equal(productSearchOr("   ").length, 0);
  });
});

describe("optionMatchesSearch", () => {
  it("finds a taxonomy card number by partial index or label", () => {
    const option = {
      value: "083/101",
      label: "#083/101",
      parentValue: "M2",
      cardSuffix: null,
    };
    assert.equal(optionMatchesSearch(option, "083"), true);
    assert.equal(optionMatchesSearch(option, "#083/101"), true);
    assert.equal(optionMatchesSearch(option, "M2"), true);
    assert.equal(optionMatchesSearch(option, "999"), false);
  });
});
