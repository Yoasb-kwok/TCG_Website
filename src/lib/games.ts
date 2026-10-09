/** Storefront game slugs. Unsupported games stay out of the menu until the catalog can filter them. */

export const DEFAULT_CATALOG_GAME = "pokemon";

export const CATALOG_GAMES = {
  pokemon: { label: "Pokémon TCG", supported: true },
  "one-piece": { label: "One Piece TCG", supported: false },
  lorcana: { label: "Disney Lorcana", supported: false },
} as const;

export type CatalogGameSlug = keyof typeof CATALOG_GAMES;

export interface CatalogGame {
  slug: string;
  label: string;
  supported: boolean;
}

export function catalogGame(slug: string | null | undefined): CatalogGame | null {
  const key = slug?.trim().toLowerCase();
  if (!key) return null;
  const known = CATALOG_GAMES[key as CatalogGameSlug];
  if (known) return { slug: key, ...known };
  return { slug: key, label: slug?.trim() || key, supported: false };
}

/** No game query means the default Pokémon catalog. Unknown or unsupported slugs do not. */
export function isSupportedCatalogGame(slug: string | null | undefined): boolean {
  const game = catalogGame(slug);
  if (!game) return true;
  return game.supported;
}

export function productMatchesGame(
  productGame: string | null | undefined,
  filter: string | null | undefined,
): boolean {
  const requested = filter?.trim().toLowerCase();
  if (!requested) return true;
  const actual = productGame?.trim().toLowerCase() || DEFAULT_CATALOG_GAME;
  return actual === requested;
}
