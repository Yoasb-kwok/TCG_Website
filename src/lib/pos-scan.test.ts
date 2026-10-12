import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchPosScan, posScanOr } from "./pos-scan";

const egg = {
  setCode: "M6a",
  cardNumber: "001/103",
  externalCardId: null,
  variants: [{ id: "v1", sku: "EGG-NM", barcode: "4891234567890", stock: 2 }],
};

describe("matchPosScan", () => {
  it("matches spaced set codes to the printed collector number", () => {
    for (const query of ["M6a 001", "M6a001", "m6a 001", "M6a-001", "M6a_001"]) {
      const match = matchPosScan([egg], query);
      assert.equal(match?.matchedBy, "cardNumber", query);
      assert.equal(match?.variantId, "v1", query);
    }
  });

  it("matches a combined card number with a space in the query", () => {
    const stored = { ...egg, cardNumber: "M6a-001", setCode: null };
    assert.equal(matchPosScan([stored], "M6a 001")?.matchedBy, "cardNumber");
    assert.equal(matchPosScan([{ ...egg, cardNumber: "M6a001" }], "m6a 001")?.variantId, "v1");
  });

  it("keeps barcode and sku exact, and does not treat a name as a card code", () => {
    assert.equal(matchPosScan([egg], "4891234567890")?.matchedBy, "barcode");
    assert.equal(matchPosScan([egg], "EGG-NM")?.matchedBy, "sku");
    assert.equal(matchPosScan([egg], "蛋蛋"), null);
    assert.equal(matchPosScan([egg], "M6a 002"), null);
  });
});

describe("posScanOr", () => {
  it("includes equivalent card-number forms and the set plus index", () => {
    const clauses = posScanOr("M6a 001");
    const cardNumbers = clauses.find((clause) => "cardNumber" in clause) as {
      cardNumber: { in: string[] };
    };
    assert.ok(cardNumbers.cardNumber.in.includes("M6a-001"));
    assert.ok(cardNumbers.cardNumber.in.includes("M6a001"));
    const paired = clauses.find((clause) => "AND" in clause) as {
      AND: [{ setCode: { equals: string } }, { OR: Array<{ cardNumber: { startsWith?: string } }> }];
    };
    assert.equal(paired.AND[0].setCode.equals, "M6a");
    assert.ok(paired.AND[1].OR.some((item) => item.cardNumber.startsWith === "001/"));
    assert.equal(posScanOr("皮卡丘").some((clause) => "AND" in clause), false);
  });
});
