import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSetCollectorCode, setIndexCatalogAnd } from "./card-number-format";
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

const egg = {
  name: "蛋蛋",
  description: "M6a · #001/103",
  cardSet: "30th CELEBRATION",
  cardNumber: "001/103",
  setCode: "M6a",
  rarity: "C",
  rarityTier: "C",
  externalCardId: null,
  variants: [{ sku: "EGG-NM", barcode: null }],
};

describe("normalizeSetCollectorCode", () => {
  it("treats spaced, compact, hyphen, and underscore codes as the same card", () => {
    for (const query of ["M6a 001", "M6a001", "m6a 001", "M6a-001", "M6a_001", "M6a #001"]) {
      assert.equal(normalizeSetCollectorCode(query), "m6a001", query);
    }
  });

  it("leaves names and ordinary card numbers alone", () => {
    assert.equal(normalizeSetCollectorCode("蛋蛋"), null);
    assert.equal(normalizeSetCollectorCode("30th CELEBRATION"), null);
    assert.equal(normalizeSetCollectorCode("083/101"), null);
    assert.equal(normalizeSetCollectorCode("皮卡丘"), null);
  });
});

describe("productSearchNeedles", () => {
  it("normalizes card-number punctuation and padding", () => {
    assert.deepEqual(productSearchNeedles("  #083 / 101 "), ["#083 / 101", "083 / 101", "083/101", "83/101"]);
    assert.ok(productSearchNeedles("083-101").includes("083/101"));
    assert.ok(productSearchNeedles("83/101").includes("083/101"));
    assert.deepEqual(productSearchNeedles("   "), []);
  });

  it("adds hyphen and underscore forms for a set code plus index", () => {
    const needles = productSearchNeedles("M6a 001");
    for (const form of ["M6a 001", "M6a001", "M6a-001", "M6a_001"]) {
      assert.ok(needles.includes(form), form);
    }
    assert.ok(productSearchNeedles("m6a 001").includes("m6a001"));
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

  it("matches a spaced set code to the same card as compact and hyphen forms", () => {
    for (const query of ["M6a 001", "M6a001", "m6a 001", "M6a-001", "M6a_001"]) {
      assert.equal(productMatchesSearch(egg, query), true, query);
      assert.equal(productMatchesSearch({ ...egg, cardNumber: "M6a-001", setCode: null }, query), true, query);
      assert.equal(productMatchesSearch({ ...egg, cardNumber: "M6a001", setCode: null }, query), true, query);
    }
    assert.equal(productMatchesSearch(egg, "蛋蛋"), true);
    assert.equal(productMatchesSearch(egg, "30th CELEBRATION"), true);
    assert.equal(productMatchesSearch(egg, "M6a 999"), false);
  });

  it("rejects an unrelated name", () => {
    assert.equal(productMatchesSearch(pikachu, "噴火龍"), false);
    assert.equal(productMatchesSearch(egg, "噴火龍"), false);
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
          "some" in clause.variants &&
          clause.variants.some != null &&
          typeof clause.variants.some === "object" &&
          "sku" in clause.variants.some,
      ),
    );
    assert.ok(
      clauses.some(
        (clause) =>
          clause.variants != null &&
          typeof clause.variants === "object" &&
          "some" in clause.variants &&
          clause.variants.some != null &&
          typeof clause.variants.some === "object" &&
          "barcode" in clause.variants.some,
      ),
    );
    assert.equal(productSearchOr("   ").length, 0);
  });

  it("pairs a set code with the collector index for spaced card numbers", () => {
    const clauses = productSearchOr("M6a 001");
    const paired = clauses.find((clause) => "AND" in clause) as {
      AND: [
        { setCode: { equals: string } },
        { OR: Array<{ cardNumber: { startsWith?: string; equals?: string } }> },
      ];
    };
    assert.equal(paired.AND[0].setCode.equals, "M6a");
    assert.ok(paired.AND[1].OR.some((item) => item.cardNumber.startsWith === "001/"));
    assert.equal(
      productSearchOr("皮卡丘").some((clause) => "AND" in clause),
      false,
    );
    assert.equal(
      productSearchOr("30th CELEBRATION").some((clause) => "AND" in clause),
      false,
    );
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
    assert.equal(optionMatchesSearch(option, "M2 083"), true);
    assert.equal(optionMatchesSearch(option, "999"), false);
  });
});

describe("setIndexCatalogAnd", () => {
  it("looks up set M6a card 001 for spaced and compact queries", () => {
    for (const query of ["M6a 001", "M6a001", "m6a 001", "M6a-001"]) {
      const clause = setIndexCatalogAnd(query) as {
        AND: [
          { set: { code: { equals: string } } },
          { OR: Array<{ collectorNumber?: { startsWith?: string } }> },
        ];
      };
      assert.ok(clause, query);
      assert.equal(clause.AND[0].set.code.equals.toLowerCase(), "m6a");
      assert.ok(
        clause.AND[1].OR.some((item) => item.collectorNumber?.startsWith === "001/"),
        query,
      );
    }
    assert.equal(setIndexCatalogAnd("蛋蛋"), null);
    assert.equal(setIndexCatalogAnd("30th CELEBRATION"), null);
  });
});
