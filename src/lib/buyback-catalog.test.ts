import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogBuybackOffer } from "@/components/pos/catalog-buyback-offer";
import {
  catalogBuybackPatch,
  catalogBuybackPayload,
  catalogBuybackPriceLabel,
  catalogTargetBuybackQtyLabel,
  parseCatalogBuybackPrice,
  parseTargetBuybackQty,
} from "./buyback-catalog";
import { prepareBuyback } from "./pos-buyback";

describe("catalog buyback offer", () => {
  it("stores a blank offer as unset and rounds an HKD price", () => {
    const blank = catalogBuybackPayload("", "  ");
    assert.equal(blank.ok, true);
    if (!blank.ok) return;
    assert.equal(blank.buybackPrice, null);
    assert.equal(blank.targetBuybackQty, null);

    const priced = catalogBuybackPayload("12.555", 4);
    assert.equal(priced.ok, true);
    if (!priced.ok) return;
    assert.equal(priced.buybackPrice, 12.56);
    assert.equal(priced.targetBuybackQty, 4);
    const zero = parseCatalogBuybackPrice(0);
    assert.equal(zero.ok, true);
    if (!zero.ok) return;
    assert.equal(zero.value, 0);
  });

  it("rejects a price or quantity that is not a catalog number", () => {
    assert.equal(parseCatalogBuybackPrice(-1).ok, false);
    assert.equal(parseCatalogBuybackPrice("abc").ok, false);
    assert.equal(parseTargetBuybackQty(1.5).ok, false);
    assert.equal(parseTargetBuybackQty(-2).ok, false);
  });

  it("patches only the fields the editor sent", () => {
    const priceOnly = catalogBuybackPatch({ buybackPrice: 80 });
    assert.deepEqual(priceOnly, { ok: true, data: { buybackPrice: 80 } });

    const cleared = catalogBuybackPatch({ buybackPrice: null, targetBuybackQty: "" });
    assert.deepEqual(cleared, { ok: true, data: { buybackPrice: null, targetBuybackQty: null } });
  });

  it("labels the standing offer for staff, including an unset offer", () => {
    assert.match(catalogBuybackPriceLabel(12.5), /回收價/);
    assert.match(catalogBuybackPriceLabel(12.5), /12\.50/);
    assert.equal(catalogBuybackPriceLabel(null), "回收價 未設定");
    assert.equal(catalogTargetBuybackQtyLabel(0), "希望回收數量 0");
    assert.equal(catalogTargetBuybackQtyLabel(undefined), "希望回收數量 未設定");

    const html = renderToStaticMarkup(
      createElement(CatalogBuybackOffer, { variant: "panel", buybackPrice: 12.5, targetBuybackQty: 1 }),
    );
    assert.match(html, /回收價/);
    assert.match(html, /12\.50/);
    assert.match(html, /希望回收數量 1/);
    assert.match(html, /仍可收卡/);
  });

  it("does not turn the target quantity into a buyback limit", () => {
    const offer = catalogBuybackPayload(8, 1);
    assert.equal(offer.ok, true);
    const result = prepareBuyback({ quantity: 5, unitBuyPrice: 8, variantId: "variant-1" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.draft.quantity, 5);
    assert.equal(result.draft.unitBuyPrice, 8);
  });
});
