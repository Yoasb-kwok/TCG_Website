import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { leadingCollectorIndex } from "./card-number-format";
import { parseCatalogCsv } from "./catalog-csv";
import { productSearchNeedles } from "./product-search";
import {
  cardMatchesExactNumber,
  catalogResolvesProducts,
  classifyCatalogQuery,
  prefersExactCatalogCode,
  productOrFromCatalogCards,
  type CatalogResolveCard,
} from "./catalog-resolve";

const celebi: CatalogResolveCard = {
  setCode: "M6a",
  collectorNumber: "001/086",
  altCollectorNumber: "002/086",
  nameZhTw: "時拉比",
  nameJa: "セレビィ",
  nameEn: "",
};

describe("classifyCatalogQuery", () => {
  it("treats a long digit string as a barcode and skips the catalog", () => {
    assert.deepEqual(classifyCatalogQuery("4891234567890"), { kind: "skip" });
    assert.deepEqual(classifyCatalogQuery("  "), { kind: "skip" });
  });

  it("reads a collector number, including a set prefix", () => {
    assert.deepEqual(classifyCatalogQuery("#1/86"), {
      kind: "number",
      setCode: undefined,
      number: "001/086",
    });
    assert.deepEqual(classifyCatalogQuery("M6a 001/086"), {
      kind: "number",
      setCode: "M6a",
      number: "001/086",
    });
    assert.deepEqual(classifyCatalogQuery("M6a-001/086"), {
      kind: "number",
      setCode: "M6a",
      number: "001/086",
    });
    assert.deepEqual(classifyCatalogQuery("083"), { kind: "number", number: "083" });
  });

  it("reads a set code plus collector index with spaces, hyphens, or neither", () => {
    for (const query of ["M6a 001", "M6a001", "M6a-001", "M6a_001"]) {
      assert.deepEqual(classifyCatalogQuery(query), {
        kind: "number",
        setCode: "M6a",
        number: "001",
      });
    }
    assert.deepEqual(classifyCatalogQuery("m6a 001"), {
      kind: "number",
      setCode: "m6a",
      number: "001",
    });
    assert.deepEqual(classifyCatalogQuery("M6a"), { kind: "text", search: "M6a" });
  });

  it("treats short set and energy codes as exact codes", () => {
    assert.equal(prefersExactCatalogCode("GRA"), true);
    assert.equal(prefersExactCatalogCode("M6a"), true);
    assert.equal(prefersExactCatalogCode("蛋蛋"), false);
    assert.equal(prefersExactCatalogCode("30th CELEBRATION"), false);
  });

  it("keeps card names as text", () => {
    assert.deepEqual(classifyCatalogQuery("30th CELEBRATION"), {
      kind: "text",
      search: "30th CELEBRATION",
    });
  });
});

describe("M6a catalog sample", () => {
  const parsed = parseCatalogCsv(readFileSync("prisma/catalog/samples/m6a.csv", "utf8"));

  function cardsForSetIndex(query: string) {
    const classified = classifyCatalogQuery(query);
    assert.equal(classified.kind, "number");
    if (classified.kind !== "number" || !classified.setCode) return [];
    return parsed.sets.flatMap((set) =>
      set.code.toLowerCase() === classified.setCode?.toLowerCase()
        ? set.cards.filter((card) => leadingCollectorIndex(card.collectorNumber) === classified.number)
        : [],
    );
  }

  it("finds the same printed card for spaced, compact, and hyphen queries", () => {
    for (const query of ["M6a 001", "M6a001", "m6a 001", "M6a-001", "M6a_001"]) {
      const hits = cardsForSetIndex(query);
      assert.equal(hits.length, 1, query);
      assert.equal(hits[0]?.nameZhTw, "蛋蛋", query);
      assert.equal(hits[0]?.nameJa, "タマタマ", query);
    }
  });

  it("still finds Traditional Chinese names and the English set name", () => {
    assert.deepEqual(classifyCatalogQuery("皮卡丘"), { kind: "text", search: "皮卡丘" });
    assert.deepEqual(classifyCatalogQuery("30th CELEBRATION"), {
      kind: "text",
      search: "30th CELEBRATION",
    });
    const needles = productSearchNeedles("皮卡丘").map((needle) => needle.toLowerCase());
    const pikachu = parsed.sets.flatMap((set) =>
      set.cards.filter((card) =>
        needles.some((needle) => (card.nameZhTw ?? "").toLowerCase().includes(needle)),
      ),
    );
    assert.ok(pikachu.length > 1);
    assert.ok(parsed.sets.some((set) => set.nameEn === "30th CELEBRATION"));
  });
});

describe("catalogResolvesProducts", () => {
  it("resolves a full collector number or a short name list, not a partial index or a whole set", () => {
    assert.equal(catalogResolvesProducts("number", 2, "001/086"), true);
    assert.equal(catalogResolvesProducts("number", 21, "001/086"), false);
    assert.equal(catalogResolvesProducts("number", 2, "083"), false);
    assert.equal(catalogResolvesProducts("text", 8), true);
    assert.equal(catalogResolvesProducts("text", 9), false);
    assert.equal(catalogResolvesProducts("text", 0), false);
  });
});

describe("cardMatchesExactNumber", () => {
  it("matches the primary number or one alternate half", () => {
    const card = { collectorNumber: "151/103", altCollectorNumber: "152/103" };
    assert.equal(cardMatchesExactNumber(card, "151/103"), true);
    assert.equal(cardMatchesExactNumber(card, "152/103"), true);
    assert.equal(cardMatchesExactNumber(card, "011/103"), false);
    assert.equal(cardMatchesExactNumber({ collectorNumber: "011/103" }, "001/103"), false);
  });
});

describe("productOrFromCatalogCards", () => {
  it("resolves a number query to the official names and both collector numbers", () => {
    const clauses = productOrFromCatalogCards([celebi], "number");
    assert.ok(clauses.some((clause) => "name" in clause && (clause.name as { equals: string }).equals === "時拉比"));
    assert.ok(clauses.some((clause) => "name" in clause && (clause.name as { equals: string }).equals === "セレビィ"));
    assert.equal(
      clauses.filter((clause) => "cardNumber" in clause).length,
      2,
    );
    const paired = clauses.find((clause) => "AND" in clause) as {
      AND: Array<Record<string, { equals: string }>>;
    };
    assert.equal(paired.AND[0].setCode.equals, "M6a");
    assert.equal(paired.AND[1].cardNumber.equals, "001/086");
  });

  it("resolves a name query to collector numbers and skips 待補", () => {
    const clauses = productOrFromCatalogCards(
      [{ ...celebi, nameZhTw: "待補", nameJa: "  ", nameEn: null }],
      "text",
    );
    assert.equal(clauses.some((clause) => "name" in clause), false);
    assert.ok(clauses.some((clause) => "cardNumber" in clause));
  });
});
