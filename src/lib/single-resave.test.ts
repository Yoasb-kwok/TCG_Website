import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existingSingleResaveError, existingSingleTaxonomyPayload } from "./single-resave";

describe("existing single re-save", () => {
  it("allows a catalog row with no set code or rarity and does not invent either", () => {
    assert.equal(existingSingleResaveError({ name: "卡套(日版)" }), null);
    assert.deepEqual(
      existingSingleTaxonomyPayload({
        setCode: "  ",
        rarityTier: "",
        cardNumber: "",
        cardCategory: "POKEMON",
      }),
      {
        setCode: null,
        rarityTier: null,
        cardNumber: undefined,
        cardCategory: "POKEMON",
      },
    );
  });

  it("still asks for a name", () => {
    assert.equal(existingSingleResaveError({ name: "  " }), "請填寫名稱");
  });

  it("keeps a set code and rarity the merchant actually chose", () => {
    assert.deepEqual(
      existingSingleTaxonomyPayload({
        setCode: "SV3",
        rarityTier: "SR",
        cardNumber: " 198 ",
        cardCategory: "POKEMON",
      }),
      {
        setCode: "SV3",
        rarityTier: "SR",
        cardNumber: "198",
        cardCategory: "POKEMON",
      },
    );
  });
});
