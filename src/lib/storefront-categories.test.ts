import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPokemonL2Categories,
  describeProductCategoryQuery,
  FALLBACK_POKEMON_L2,
  POKEMON_TCG_CATEGORY,
} from "./storefront-categories";

test("Pokémon TCG is the only L1 game in the product menu", () => {
  assert.equal(POKEMON_TCG_CATEGORY.label, "Pokémon TCG");
  assert.equal(POKEMON_TCG_CATEGORY.href, "/products?game=pokemon");
});

test("fallback L2 splits sealed boxes and booster packs into real product types", () => {
  assert.deepEqual(
    FALLBACK_POKEMON_L2.map((item) => item.label),
    ["單卡", "封盒", "補充包", "禮盒", "配件", "繁體中文版", "英文版", "日文版"],
  );
  assert.equal(
    FALLBACK_POKEMON_L2.find((item) => item.label === "補充包")?.href,
    "/products?game=pokemon&type=BOOSTER_PACK",
  );
  assert.equal(
    FALLBACK_POKEMON_L2.some((item) => item.label.includes("封盒 /")),
    false,
  );
});

test("catalog products become the L2 list and skip empty inferred series", () => {
  const links = buildPokemonL2Categories({
    types: ["BOOSTER_PACK", "SINGLE", "SEALED_BOX"],
    languages: ["en", "zh-HK"],
    cardSets: ["Scarlet & Violet—151", "Evolving Skies"],
    setCodes: ["OTHER"],
  });

  assert.deepEqual(
    links.map((item) => [item.group, item.label]),
    [
      ["type", "單卡"],
      ["type", "封盒"],
      ["type", "補充包"],
      ["language", "繁體中文版"],
      ["language", "英文版"],
      ["series", "Scarlet & Violet—151"],
      ["series", "Evolving Skies"],
    ],
  );
  assert.equal(links.find((item) => item.label === "單卡")?.href, "/products?game=pokemon&type=SINGLE");
  assert.match(
    links.find((item) => item.label === "Scarlet & Violet—151")?.href ?? "",
    /cardSet=Scarlet(\+|%20)%26(\+|%20)Violet/,
  );
});

test("official catalog sets use set codes and do not repeat the same series name", () => {
  const links = buildPokemonL2Categories({
    types: ["SINGLE"],
    typeLabels: [{ value: "SINGLE", label: "單卡" }],
    catalogSets: [
      { code: "M6a", nameZhTw: "30th CELEBRATION" },
      { code: "M6", nameZhTw: "綠寶石風暴" },
    ],
    cardSets: ["30th CELEBRATION", "Scarlet & Violet—151"],
    setCodes: ["M6a", "OTHER"],
  });

  assert.deepEqual(
    links.filter((item) => item.group === "series").map((item) => item.label),
    ["M6a 30th CELEBRATION", "M6 綠寶石風暴", "Scarlet & Violet—151"],
  );
  assert.equal(
    links.find((item) => item.label === "M6a 30th CELEBRATION")?.href,
    "/products?game=pokemon&setCode=M6a",
  );
});

test("an empty catalog falls back instead of rendering a blank menu", () => {
  assert.deepEqual(
    buildPokemonL2Categories({ types: [], languages: [], cardSets: [], setCodes: [] }).map(
      (item) => item.label,
    ),
    FALLBACK_POKEMON_L2.map((item) => item.label),
  );
});

test("category captions use the same shop labels as the menu", () => {
  assert.equal(
    describeProductCategoryQuery({ type: "BOOSTER_PACK", language: "zh-HK" }),
    "補充包 · 繁體中文版",
  );
  assert.equal(describeProductCategoryQuery({ cardSet: "Evolving Skies" }), "Evolving Skies");
  assert.equal(describeProductCategoryQuery({}), null);
});
