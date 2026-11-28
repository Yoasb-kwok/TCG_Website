import assert from "node:assert/strict";
import test from "node:test";
import { BUILTIN_HERO_ARTWORK, heroUsesBuiltinArtwork } from "./home-hero";

test("an empty or preset image keeps the designed 151 artwork", () => {
  assert.equal(heroUsesBuiltinArtwork({ title: "其他系列", image: "" }), true);
  assert.equal(
    heroUsesBuiltinArtwork({ title: "其他系列", image: BUILTIN_HERO_ARTWORK }),
    true,
  );
});

test("the default Scarlet logo still uses the designed card composition", () => {
  assert.equal(
    heroUsesBuiltinArtwork({
      title: "Scarlet & Violet 151",
      image: "https://images.pokemontcg.io/sv3pt5/logo.png",
    }),
    true,
  );
});

test("a merchant upload replaces the right-hand image for that slide", () => {
  assert.equal(
    heroUsesBuiltinArtwork({
      title: "Scarlet & Violet 151",
      image: "/uploads/banners/custom.png",
    }),
    false,
  );
  assert.equal(
    heroUsesBuiltinArtwork({
      title: "店賽報名",
      image: "/brand/home/pikachu-151.png",
    }),
    false,
  );
});
