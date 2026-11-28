/** Right-hand art that stays with the Scarlet & Violet 151 copy until a merchant replaces it. */
export const BUILTIN_HERO_ARTWORK = "preset:sv151";

const LEGACY_SET_LOGO = "images.pokemontcg.io/sv3pt5";

export function heroUsesBuiltinArtwork(slide: { title: string; image: string }): boolean {
  const image = slide.image.trim();
  if (!image || image === BUILTIN_HERO_ARTWORK) return true;
  return (
    image.includes(LEGACY_SET_LOGO) &&
    /scarlet/i.test(slide.title) &&
    slide.title.includes("151")
  );
}
