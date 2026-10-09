import assert from "node:assert/strict";
import test from "node:test";
import { createSale } from "./pos-ledger";
import { prepareSale, saleTotal } from "./pos-shared";

const booster = {
  name: "SV151 booster",
  sku: "SV151-BOOSTER",
  quantity: 1,
  unitPrice: 55,
  unitCost: 32,
};

test("prepareSale accepts cash and PayMe for a scanned booster", () => {
  for (const paymentMethod of ["CASH", "PAYME"] as const) {
    const result = prepareSale({ paymentMethod, items: [booster] });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.sale.paymentMethod, paymentMethod);
    assert.equal(result.sale.voided, false);
    assert.equal(result.sale.discount, 0);
    assert.equal(result.sale.items.length, 1);
    assert.equal(result.sale.items[0]?.sku, "SV151-BOOSTER");
    assert.equal(result.sale.items[0]?.quantity, 1);
    assert.equal(result.sale.items[0]?.unitPrice, 55);
    assert.equal(saleTotal(result.sale), 55);
  }
});

test("prepareSale rejects an unknown payment method and an empty cart", () => {
  assert.deepEqual(prepareSale({ paymentMethod: "", items: [booster] }), {
    ok: false,
    error: "請選擇付款方式",
  });
  assert.deepEqual(prepareSale({ paymentMethod: "CASH", items: [] }), {
    ok: false,
    error: "請先加入貨品",
  });
  const badPrice = prepareSale({
    paymentMethod: "PAYME",
    items: [{ ...booster, unitPrice: -1 }],
  });
  assert.equal(badPrice.ok, false);
});

test("createSale refuses the read-only Vercel filesystem when no database is configured", async () => {
  const previousVercel = process.env.VERCEL;
  const previousDatabase = process.env.DATABASE_URL;
  process.env.VERCEL = "1";
  delete process.env.DATABASE_URL;
  try {
    const result = await createSale({ paymentMethod: "PAYME", items: [booster] });
    assert.deepEqual(result, { ok: false, error: "收銀資料庫未設定" });
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
  }
});
