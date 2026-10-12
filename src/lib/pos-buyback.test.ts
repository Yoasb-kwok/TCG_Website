import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitBuyback } from "./pos-buyback-store";
import {
  buybackDayTotal,
  buybackTotal,
  catalogCardMatchesProduct,
  hktDayKey,
  hktDayRange,
  isWithinHktDay,
  pickBuybackVariant,
  prepareBuyback,
} from "./pos-buyback";

const variantDraft = {
  variantId: "variant-1",
  quantity: 2,
  unitBuyPrice: 12.5,
  customerName: " 陳大文 ",
  customerPhone: "852 6609 4893",
  pokemonId: " 1234-5678 ",
};

describe("prepareBuyback", () => {
  it("prices a quoted buyback and keeps the source as buyback", () => {
    const result = prepareBuyback(variantDraft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.draft.source, "buyback");
    assert.equal(result.draft.quantity, 2);
    assert.equal(result.draft.unitBuyPrice, 12.5);
    assert.equal(result.draft.totalAmount, 25);
    assert.equal(buybackTotal(2, 12.5), 25);
    assert.equal(result.draft.customerName, "陳大文");
    assert.equal(result.draft.customerPhone, "66094893");
    assert.equal(result.draft.pokemonId, "1234-5678");
    assert.equal(result.draft.catalogCardId, null);
  });

  it("accepts a catalog card without a customer", () => {
    const result = prepareBuyback({
      catalogCardId: "card-1",
      quantity: 1,
      unitBuyPrice: 80,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.draft.variantId, null);
    assert.equal(result.draft.catalogCardId, "card-1");
    assert.equal(result.draft.customerName, "");
    assert.equal(result.draft.customerPhone, "");
  });

  it("rounds the unit price before multiplying", () => {
    const result = prepareBuyback({ variantId: "variant-1", quantity: 2, unitBuyPrice: 10.126 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.draft.unitBuyPrice, 10.13);
    assert.equal(result.draft.totalAmount, 20.26);
  });

  it("rejects a missing item, a zero quote, a bad phone, and a fractional quantity", () => {
    assert.equal(prepareBuyback({ quantity: 1, unitBuyPrice: 10 }).ok, false);
    assert.deepEqual(prepareBuyback({ variantId: "variant-1", quantity: 1, unitBuyPrice: 0 }), {
      ok: false,
      error: "請填寫收購價",
    });
    assert.equal(
      prepareBuyback({ variantId: "variant-1", quantity: 1, unitBuyPrice: -5 }).ok,
      false,
    );
    const badPhone = prepareBuyback({
      variantId: "variant-1",
      quantity: 1,
      unitBuyPrice: 10,
      customerPhone: "1234567",
    });
    assert.deepEqual(badPhone, { ok: false, error: "電話號碼必須為 8 位數字" });
    assert.equal(
      prepareBuyback({ variantId: "variant-1", quantity: 1.5, unitBuyPrice: 10 }).ok,
      false,
    );
    assert.equal(
      prepareBuyback({ variantId: "variant-1", quantity: 0, unitBuyPrice: 10 }).ok,
      false,
    );
  });
});

describe("catalogCardMatchesProduct", () => {
  const card = {
    id: "card-83",
    setCode: "M2",
    collectorNumber: "083/101",
    altCollectorNumber: null,
  };

  it("matches spaced and unpadded collector numbers in the same set", () => {
    assert.equal(
      catalogCardMatchesProduct(
        { setCode: "m2", cardNumber: "083 / 101" },
        { ...card, collectorNumber: "083 / 101" },
      ),
      true,
    );
    assert.equal(
      catalogCardMatchesProduct({ setCode: "M2", cardNumber: "83/101" }, card),
      true,
    );
    assert.equal(
      catalogCardMatchesProduct({ setCode: "M6a", cardNumber: "1/103" }, {
        setCode: "M6a",
        collectorNumber: "001/103",
      }),
      true,
    );
  });

  it("does not match a different set or a different index", () => {
    assert.equal(
      catalogCardMatchesProduct({ setCode: "M3", cardNumber: "083/101" }, card),
      false,
    );
    assert.equal(
      catalogCardMatchesProduct({ setCode: "M2", cardNumber: "084/101" }, card),
      false,
    );
  });

  it("matches the catalog external id even when the printed number differs", () => {
    assert.equal(
      catalogCardMatchesProduct(
        { setCode: "OTHER", cardNumber: "001/001", externalCardId: "catalog:card-83" },
        card,
      ),
      true,
    );
  });
});

describe("pickBuybackVariant", () => {
  it("prefers a non-foil Near Mint copy", () => {
    const picked = pickBuybackVariant([
      { id: "foil", condition: "Near Mint (NM)", isFoil: true, price: 20 },
      { id: "lp", condition: "Lightly Played (LP)", isFoil: false, price: 8 },
      { id: "nm", condition: "Near Mint (NM)", isFoil: false, price: 30 },
    ]);
    assert.equal(picked?.id, "nm");
  });

  it("returns null when there is no variant", () => {
    assert.equal(pickBuybackVariant([]), null);
  });
});

describe("Hong Kong day", () => {
  it("rolls the shop day at midnight HKT, which is 16:00 UTC", () => {
    const beforeMidnight = new Date("2026-10-12T15:59:59.000Z");
    const midnight = new Date("2026-10-12T16:00:00.000Z");
    assert.equal(hktDayKey(beforeMidnight), "2026-10-12");
    assert.equal(hktDayKey(midnight), "2026-10-13");
    const range = hktDayRange(beforeMidnight);
    assert.equal(range.from.toISOString(), "2026-10-11T16:00:00.000Z");
    assert.equal(isWithinHktDay(beforeMidnight.toISOString(), beforeMidnight), true);
    assert.equal(isWithinHktDay(midnight.toISOString(), beforeMidnight), false);
  });
});

describe("buybackDayTotal", () => {
  it("skips voided rows", () => {
    assert.equal(
      buybackDayTotal([
        { voided: false, totalAmount: 40 },
        { voided: true, totalAmount: 100 },
        { voided: false, totalAmount: 15.5 },
      ]),
      55.5,
    );
  });
});

describe("commitBuyback", () => {
  it("refuses the read-only Vercel filesystem when no database is configured", async () => {
    const previousVercel = process.env.VERCEL;
    const previousDatabase = process.env.DATABASE_URL;
    process.env.VERCEL = "1";
    delete process.env.DATABASE_URL;
    try {
      const result = await commitBuyback({
        variantId: "variant-1",
        quantity: 1,
        unitBuyPrice: 10,
      });
      assert.deepEqual(result, { ok: false, error: "收銀資料庫未設定", status: 400 });
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
      if (previousDatabase === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabase;
    }
  });
});
