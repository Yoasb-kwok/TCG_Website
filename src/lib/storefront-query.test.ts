import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProducts } from "./products";
import {
  DEFAULT_STOREFRONT_FILTERS,
  catalogForRequest,
  productFiltersFromSearchParams,
  recordToURLSearchParams,
  storefrontRequestParams,
} from "./storefront-query";
import type { ProductsResponse } from "./types";

function requestFor(query: string, filters = DEFAULT_STOREFRONT_FILTERS, page = 1) {
  return storefrontRequestParams(new URLSearchParams(query), filters, page);
}

describe("storefront catalog query", () => {
  it("builds the same request from a page searchParams record and a URL", () => {
    const fromRecord = storefrontRequestParams(
      recordToURLSearchParams({ type: "SEALED_BOX", language: "zh-HK" }),
      DEFAULT_STOREFRONT_FILTERS,
      1,
    );
    const fromUrl = requestFor("language=zh-HK&type=SEALED_BOX");
    assert.equal(fromRecord.toString(), fromUrl.toString());
    assert.equal(productFiltersFromSearchParams(fromRecord).type, "SEALED_BOX");
    assert.equal(productFiltersFromSearchParams(fromRecord).language, "zh-HK");
    assert.equal(productFiltersFromSearchParams(fromRecord).minPrice, 1);
  });

  it("keeps the URL type ahead of the in-page type checkboxes", () => {
    const params = requestFor("type=SINGLE", {
      ...DEFAULT_STOREFRONT_FILTERS,
      types: ["ACCESSORY"],
    });
    assert.equal(productFiltersFromSearchParams(params).type, "SINGLE");
    assert.equal(params.getAll("type").join(","), "SINGLE,ACCESSORY");
  });

  it("trims search text and omits a blank search", () => {
    const params = requestFor("search=%20%20charizard%20ex%20");
    assert.equal(params.get("search"), "charizard ex");
    const blank = requestFor("search=%20%20");
    assert.equal(blank.has("search"), false);
  });

  it("does not paint a catalog that was loaded for a different query", () => {
    const sealed = requestFor("type=SEALED_BOX").toString();
    const singles = requestFor("type=SINGLE").toString();
    const loaded = {
      key: sealed,
      data: { products: [{ slug: "sv151-etb" }] } as unknown as ProductsResponse,
    };
    assert.equal(catalogForRequest(loaded, sealed)?.products[0]?.slug, "sv151-etb");
    assert.equal(catalogForRequest(loaded, singles), null);
    assert.equal(catalogForRequest(null, singles), null);
  });

  it("returns only the sealed box for the sealed browse URL", async () => {
    const params = requestFor("type=SEALED_BOX");
    const data = await getProducts(productFiltersFromSearchParams(params));
    assert.deepEqual(
      data.products.map((product) => product.slug),
      ["sv151-etb"],
    );
  });

  it("returns only the English single for the language browse URL", async () => {
    const params = requestFor("language=en");
    const data = await getProducts(productFiltersFromSearchParams(params));
    assert.deepEqual(
      data.products.map((product) => product.slug),
      ["umbreon-vmax-evolving"],
    );
  });
});
