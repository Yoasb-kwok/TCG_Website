import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMO_PRODUCTS } from "./demo-products";
import {
  productListOrderBy,
  rankProductIdsByMinPrice,
  type ProductListOrderKey,
} from "./product-list-order";
import { getProducts } from "./products";
import type { ProductSort } from "./types";

const BULK_CREATED_AT = Date.parse("2026-11-28T05:10:55.000Z");
const PAGE_SIZE = 100;
const PAGE_COUNT = 5;

interface TiedRow {
  id: string;
  createdAt: number;
  setSortIndex: number;
  raritySortIndex: number;
}

/**
 * 416 client rows share one createdAt, the same way the bulk import did.
 * Eight older rows stand in for the leftover demo products.
 */
function bulkCatalog(): TiedRow[] {
  const clients = Array.from({ length: 416 }, (_, index) => ({
    id: `client-${String(index).padStart(4, "0")}`,
    createdAt: BULK_CREATED_AT,
    setSortIndex: 10,
    raritySortIndex: 4,
  }));
  const demos = Array.from({ length: 8 }, (_, index) => ({
    id: `demo-${index + 1}`,
    createdAt: BULK_CREATED_AT - (index + 1) * 86_400_000,
    setSortIndex: 999,
    raritySortIndex: 99,
  }));
  return [...clients, ...demos];
}

function compareOrder(order: readonly ProductListOrderKey[], a: TiedRow, b: TiedRow): number {
  for (const key of order) {
    const diff = compareOrderKey(key, a, b);
    if (diff !== 0) return diff;
  }
  return 0;
}

function compareOrderKey(key: ProductListOrderKey, a: TiedRow, b: TiedRow): number {
  if ("id" in key) {
    const diff = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    return key.id === "asc" ? diff : -diff;
  }
  if ("createdAt" in key) {
    const diff = a.createdAt - b.createdAt;
    return key.createdAt === "asc" ? diff : -diff;
  }
  if ("setSortIndex" in key) {
    const diff = a.setSortIndex - b.setSortIndex;
    return key.setSortIndex === "asc" ? diff : -diff;
  }
  if ("raritySortIndex" in key) {
    const diff = a.raritySortIndex - b.raritySortIndex;
    return key.raritySortIndex === "asc" ? diff : -diff;
  }
  throw new Error(`Unhandled order key: ${JSON.stringify(key)}`);
}

/**
 * Same symptom as PostgreSQL OFFSET when ORDER BY is not unique.
 * Rows that compare equal may be ordered differently on the next page.
 * Flipping id order is enough: a prefix hash of equal-length ids stays monotonic
 * and would hide the skip.
 */
function pageWithUnstableTies(
  rows: readonly TiedRow[],
  order: readonly ProductListOrderKey[],
  page: number,
  pageSize: number,
): TiedRow[] {
  const decorated = rows.map((row, index) => ({ row, index }));
  decorated.sort((a, b) => {
    const diff = compareOrder(order, a.row, b.row);
    if (diff !== 0) return diff;
    const byId = a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0;
    if (byId === 0) return a.index - b.index;
    return page % 2 === 0 ? -byId : byId;
  });
  const start = (page - 1) * pageSize;
  return decorated.slice(start, start + pageSize).map((item) => item.row);
}

function walk(
  rows: readonly TiedRow[],
  order: readonly ProductListOrderKey[],
  pageSize: number,
  pages: number,
) {
  const seen = new Set<string>();
  let returned = 0;
  for (let page = 1; page <= pages; page += 1) {
    for (const row of pageWithUnstableTies(rows, order, page, pageSize)) {
      returned += 1;
      seen.add(row.id);
    }
  }
  return { unique: seen.size, returned };
}

const SQL_SORTS = ["newest", "setCode", "rarityTier", "priceAsc", "priceDesc"] as const;

describe("catalog list order", () => {
  it("ends every SQL order with product id", () => {
    for (const sort of SQL_SORTS) {
      const order = productListOrderBy(sort);
      assert.deepEqual(order[order.length - 1], { id: "asc" }, sort);
      assert.ok(order.some((key) => "id" in key), sort);
    }
    assert.deepEqual(productListOrderBy("newest"), [{ createdAt: "desc" }, { id: "asc" }]);
    assert.deepEqual(productListOrderBy(), [{ createdAt: "desc" }, { id: "asc" }]);
    assert.deepEqual(productListOrderBy("setCode"), [
      { setSortIndex: "asc" },
      { createdAt: "desc" },
      { id: "asc" },
    ]);
    assert.deepEqual(productListOrderBy("rarityTier"), [
      { raritySortIndex: "asc" },
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });

  it("keeps the primary key ahead of the id tie-break", () => {
    const older = {
      id: "zzz",
      createdAt: BULK_CREATED_AT - 1000,
      setSortIndex: 1,
      raritySortIndex: 1,
    };
    const newer = {
      id: "aaa",
      createdAt: BULK_CREATED_AT,
      setSortIndex: 2,
      raritySortIndex: 2,
    };
    assert.ok(compareOrder(productListOrderBy("newest"), newer, older) < 0);
    assert.ok(compareOrder(productListOrderBy("setCode"), older, newer) < 0);
    assert.ok(compareOrder(productListOrderBy("rarityTier"), older, newer) < 0);
  });

  it("returns each bulk-imported product once when pages are walked", () => {
    const rows = bulkCatalog();
    assert.equal(rows.length, 424);

    for (const sort of SQL_SORTS) {
      const order = productListOrderBy(sort);
      const stable = walk(rows, order, PAGE_SIZE, PAGE_COUNT);
      assert.equal(stable.returned, 424, sort);
      assert.equal(stable.unique, 424, sort);

      const unstable = walk(
        rows,
        order.filter((key) => !("id" in key)),
        PAGE_SIZE,
        PAGE_COUNT,
      );
      assert.equal(unstable.returned, 424, sort);
      assert.ok(unstable.unique < 424, `${sort} without id still covered ${unstable.unique}`);
    }
  });
});

describe("price list ranking", () => {
  it("pages by the cheapest variant before the window, including tied prices", () => {
    const ranked = rankProductIdsByMinPrice(
      [
        { id: "newest-dear", prices: [200] },
        { id: "mid", prices: [1, 90] },
        { id: "oldest-cheap", prices: [1] },
        { id: "unpriced", prices: [] },
      ],
      "priceAsc",
    );
    assert.deepEqual(ranked, ["mid", "oldest-cheap", "newest-dear", "unpriced"]);
    assert.deepEqual(
      rankProductIdsByMinPrice(
        [
          { id: "newest-dear", prices: [200] },
          { id: "mid", prices: [1, 90] },
          { id: "oldest-cheap", prices: [1] },
          { id: "unpriced", prices: [] },
        ],
        "priceDesc",
      ),
      ["newest-dear", "mid", "oldest-cheap", "unpriced"],
    );
  });

  it("walks five pages of tied prices without repeating or skipping an id", () => {
    const products = Array.from({ length: 424 }, (_, index) => ({
      id: `sku-${String(index).padStart(4, "0")}`,
      prices: [40],
    }));
    products[423] = { id: "sku-0423", prices: [1] };
    products[0] = { id: "sku-0000", prices: [999] };

    for (const sort of ["priceAsc", "priceDesc"] as const) {
      const ranked = rankProductIdsByMinPrice(products, sort);
      const seen = new Set<string>();
      let returned = 0;
      for (let page = 0; page < PAGE_COUNT; page += 1) {
        const slice = ranked.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
        returned += slice.length;
        for (const id of slice) {
          assert.equal(seen.has(id), false, `${sort} repeated ${id}`);
          seen.add(id);
        }
      }
      assert.equal(returned, 424, sort);
      assert.equal(seen.size, 424, sort);
      assert.equal(ranked[0], sort === "priceAsc" ? "sku-0423" : "sku-0000", sort);
      assert.equal(ranked[423], sort === "priceAsc" ? "sku-0000" : "sku-0423", sort);
    }
  });
});

describe("demo catalog pages", () => {
  const sorts: ProductSort[] = ["newest", "setCode", "rarityTier", "priceAsc", "priceDesc"];

  it("keeps every demo product on one unfiltered page", async () => {
    const data = await getProducts({ page: 1, pageSize: 100 });
    assert.equal(data.total, DEMO_PRODUCTS.length);
    assert.deepEqual(
      data.products.map((product) => product.slug).sort(),
      DEMO_PRODUCTS.map((product) => product.slug).sort(),
    );
  });

  for (const sort of sorts) {
    it(`walks ${sort} pages without repeating a demo product`, async () => {
      const seen = new Set<string>();
      let returned = 0;
      let total = 0;
      const firstPass: string[] = [];
      for (let page = 1; page <= 4; page += 1) {
        const data = await getProducts({ page, pageSize: 3, sort });
        total = data.total;
        returned += data.products.length;
        for (const product of data.products) {
          assert.equal(seen.has(product.id), false, product.id);
          seen.add(product.id);
          firstPass.push(product.id);
        }
      }
      const secondPass: string[] = [];
      for (let page = 1; page <= 4; page += 1) {
        const data = await getProducts({ page, pageSize: 3, sort });
        secondPass.push(...data.products.map((product) => product.id));
      }
      assert.equal(total, DEMO_PRODUCTS.length);
      assert.equal(returned, DEMO_PRODUCTS.length);
      assert.equal(seen.size, DEMO_PRODUCTS.length);
      assert.deepEqual(secondPass, firstPass);
    });
  }
});
