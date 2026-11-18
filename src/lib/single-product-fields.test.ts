import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { singleProductFieldPatch } from "./single-product-fields";

describe("single card re-save", () => {
  it("keeps series and rarity off the patch when they are blank", () => {
    const patch = singleProductFieldPatch({ name: "PCS 匯入貨" });
    assert.equal(patch.name, "PCS 匯入貨");
    assert.equal("setCode" in patch, false);
    assert.equal("rarityTier" in patch, false);
    assert.equal("cardCategory" in patch, false);
    assert.equal(patch.setCode, undefined);
    assert.equal(patch.cardNumber, null);
  });

  it("still writes series and rarity when the cashier fills them in", () => {
    const patch = singleProductFieldPatch({
      name: "皮卡丘",
      setCode: "SV3",
      rarityTier: "R",
      cardCategory: "POKEMON",
      cardNumber: "045",
    });
    assert.equal(patch.setCode, "SV3");
    assert.equal(patch.rarityTier, "R");
    assert.equal(patch.cardCategory, "POKEMON");
    assert.equal(patch.cardNumber, "045");
    assert.match(String(patch.description), /SV3/);
  });
});
