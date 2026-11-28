import assert from "node:assert/strict";
import test from "node:test";
import { rankInStockProducts } from "./popular-products";

test("sold-out products are left out even when they sold the most", () => {
  const ranked = rankInStockProducts([
    {
      id: "sold-out",
      purchaseCount: 40,
      createdAt: "2026-11-01",
      variants: [{ stock: 0 }],
    },
    {
      id: "sleeves",
      purchaseCount: 3,
      createdAt: "2026-10-01",
      variants: [{ stock: 12 }],
    },
    {
      id: "etb",
      purchaseCount: 9,
      createdAt: "2026-09-01",
      variants: [{ stock: 2 }, { stock: 0 }],
    },
  ]);
  assert.deepEqual(
    ranked.map((product) => product.id),
    ["etb", "sleeves"],
  );
});

test("top four follow completed purchase quantity, then newer stock", () => {
  const ranked = rankInStockProducts(
    [
      { id: "a", purchaseCount: 1, createdAt: "2026-01-01", variants: [{ stock: 1 }] },
      { id: "b", purchaseCount: 5, createdAt: "2026-01-02", variants: [{ stock: 1 }] },
      { id: "c", purchaseCount: 5, createdAt: "2026-06-01", variants: [{ stock: 1 }] },
      { id: "d", purchaseCount: 0, createdAt: "2026-11-01", variants: [{ stock: 1 }] },
      { id: "e", purchaseCount: 2, createdAt: "2026-03-01", variants: [{ stock: 1 }] },
      { id: "f", purchaseCount: 8, createdAt: "2026-02-01", variants: [{ stock: 0 }] },
    ],
    4,
  );
  assert.deepEqual(
    ranked.map((product) => product.id),
    ["c", "b", "e", "a"],
  );
});
