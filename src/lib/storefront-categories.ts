import { CATALOG_GAMES, DEFAULT_CATALOG_GAME } from "@/lib/games";

export type StorefrontCategoryGroup = "type" | "language" | "series";

export interface StorefrontCategoryLink {
  id: string;
  label: string;
  href: string;
  group: StorefrontCategoryGroup;
}

export interface TaxonomyLabel {
  value: string;
  label: string;
  active?: boolean;
}

export interface CatalogSeriesSource {
  code: string;
  nameZhTw?: string | null;
  nameEn?: string | null;
}

export interface PokemonCategorySource {
  types?: string[] | null;
  languages?: string[] | null;
  cardSets?: string[] | null;
  setCodes?: string[] | null;
  typeLabels?: TaxonomyLabel[] | null;
  setLabels?: TaxonomyLabel[] | null;
  catalogSets?: CatalogSeriesSource[] | null;
}

export const CATEGORY_GROUP_LABELS: Record<StorefrontCategoryGroup, string> = {
  type: "類型",
  language: "語言",
  series: "系列",
};

export const POKEMON_TCG_CATEGORY = {
  id: "pokemon",
  label: CATALOG_GAMES.pokemon.label,
  href: `/products?game=${DEFAULT_CATALOG_GAME}`,
} as const;

const TYPE_ORDER = ["SINGLE", "SEALED_BOX", "BOOSTER_PACK", "GIFT_BOX", "ACCESSORY"] as const;

const TYPE_LABELS: Record<string, string> = {
  SINGLE: "單卡",
  SEALED_BOX: "封盒",
  BOOSTER_PACK: "補充包",
  GIFT_BOX: "禮盒",
  ACCESSORY: "配件",
};

const LANGUAGE_ORDER = ["zh-HK", "zh-TW", "zh", "en", "ja"] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  "zh-HK": "繁體中文版",
  "zh-TW": "繁體中文版",
  zh: "中文版",
  en: "英文版",
  ja: "日文版",
};

/** Shown when the catalog cannot be read. Matches the shop's product-type taxonomy. */
export const FALLBACK_POKEMON_L2: readonly StorefrontCategoryLink[] = [
  ...TYPE_ORDER.map((value) => categoryLink("type", value, TYPE_LABELS[value], { type: value })),
  ...(["zh-HK", "en", "ja"] as const).map((value) =>
    categoryLink("language", value, LANGUAGE_LABELS[value], { language: value }),
  ),
];

function categoryLink(
  group: StorefrontCategoryGroup,
  id: string,
  label: string,
  params: Record<string, string>,
): StorefrontCategoryLink {
  const search = new URLSearchParams();
  search.set("game", DEFAULT_CATALOG_GAME);
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value);
  }
  return {
    id: `${group}-${id}`,
    label,
    href: `/products?${search.toString()}`,
    group,
  };
}

export function productTypeLabel(value: string, labels?: TaxonomyLabel[] | null): string {
  const match = labels?.find((row) => row.value === value)?.label?.trim();
  if (match) return match;
  return TYPE_LABELS[value] ?? value;
}

export function languageLabel(value: string): string {
  return LANGUAGE_LABELS[value] ?? value;
}

function ordered(values: string[], preferred: readonly string[]): string[] {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return unique.sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    const as = ai === -1 ? preferred.length : ai;
    const bs = bi === -1 ? preferred.length : bi;
    if (as !== bs) return as - bs;
    return a.localeCompare(b);
  });
}

function remember(seen: Set<string>, value: string | null | undefined): boolean {
  const key = value?.trim().toLowerCase() ?? "";
  if (!key || key === "other") return false;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function seriesLinks(source: PokemonCategorySource): StorefrontCategoryLink[] {
  const links: StorefrontCategoryLink[] = [];
  const seen = new Set<string>();
  const catalogSets = source.catalogSets?.filter((set) => set.code?.trim()) ?? [];

  if (catalogSets.length > 0) {
    for (const set of catalogSets) {
      const code = set.code.trim();
      if (!remember(seen, code)) continue;
      const named =
        set.nameZhTw?.trim() ||
        set.nameEn?.trim() ||
        source.setLabels?.find((row) => row.value === code)?.label?.trim() ||
        "";
      if (named) remember(seen, named);
      const label = named && named.toLowerCase() !== code.toLowerCase() ? `${code} ${named}` : named || code;
      links.push(categoryLink("series", code, label, { setCode: code }));
    }
  } else {
    for (const code of source.setCodes ?? []) {
      const trimmed = code.trim();
      if (!remember(seen, trimmed)) continue;
      const named = source.setLabels?.find((row) => row.value === trimmed)?.label?.trim() || "";
      if (named) remember(seen, named);
      const label =
        named && named.toLowerCase() !== trimmed.toLowerCase() ? `${trimmed} ${named}` : named || trimmed;
      links.push(categoryLink("series", trimmed, label, { setCode: trimmed }));
    }
  }

  for (const name of source.cardSets ?? []) {
    const trimmed = name.trim();
    if (!remember(seen, trimmed)) continue;
    links.push(categoryLink("series", trimmed, trimmed, { cardSet: trimmed }));
  }

  return links;
}

/**
 * L2 links under Pokémon TCG. Values come from products and the card catalog.
 * An empty source falls back to the shop's product-type and language list.
 */
export function buildPokemonL2Categories(source: PokemonCategorySource = {}): StorefrontCategoryLink[] {
  const links: StorefrontCategoryLink[] = [
    ...ordered(source.types ?? [], TYPE_ORDER).map((value) =>
      categoryLink("type", value, productTypeLabel(value, source.typeLabels), { type: value }),
    ),
    ...ordered(source.languages ?? [], LANGUAGE_ORDER).map((value) =>
      categoryLink("language", value, languageLabel(value), { language: value }),
    ),
    ...seriesLinks(source),
  ];
  if (links.length === 0) return FALLBACK_POKEMON_L2.map((item) => ({ ...item }));
  return links;
}

export function describeProductCategoryQuery(query: {
  type?: string | null;
  language?: string | null;
  cardSet?: string | null;
  setCodes?: string[] | null;
}): string | null {
  const parts: string[] = [];
  if (query.type?.trim()) parts.push(productTypeLabel(query.type.trim()));
  if (query.language?.trim()) parts.push(languageLabel(query.language.trim()));
  if (query.cardSet?.trim()) parts.push(query.cardSet.trim());
  for (const code of query.setCodes ?? []) {
    if (code.trim()) parts.push(code.trim());
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
