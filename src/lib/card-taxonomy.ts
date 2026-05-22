/**
 * 港版寶可夢 TCG 系列編號與稀有度分類（篩選 / 排序）
 */

export const SET_SERIES_CODES = [
  { value: "M3", label: "M3", sortIndex: 0 },
  { value: "M2A", label: "M2A", sortIndex: 1 },
  { value: "M2", label: "M2", sortIndex: 2 },
  { value: "M1S", label: "M1S", sortIndex: 3 },
  { value: "M1L", label: "M1L", sortIndex: 4 },
  { value: "M1", label: "M1", sortIndex: 5 },
  { value: "SV8", label: "SV8", sortIndex: 10 },
  { value: "SV7", label: "SV7", sortIndex: 11 },
  { value: "SV6", label: "SV6", sortIndex: 12 },
  { value: "SV5", label: "SV5", sortIndex: 13 },
  { value: "SV4", label: "SV4", sortIndex: 14 },
  { value: "SV3", label: "SV3", sortIndex: 15 },
  { value: "SV2", label: "SV2", sortIndex: 16 },
  { value: "SV1", label: "SV1", sortIndex: 17 },
  { value: "S12", label: "S12", sortIndex: 20 },
  { value: "S11", label: "S11", sortIndex: 21 },
  { value: "OTHER", label: "其他系列", sortIndex: 999 },
] as const;

export type SetSeriesCode = (typeof SET_SERIES_CODES)[number]["value"];

export const RARITY_TIERS = [
  { value: "MUR", label: "MUR", sortIndex: 0 },
  { value: "SAR", label: "SAR", sortIndex: 1 },
  { value: "SR", label: "SR", sortIndex: 2 },
  { value: "AR", label: "AR", sortIndex: 3 },
  { value: "RR", label: "RR", sortIndex: 4 },
  { value: "R_SHINY", label: "R閃", sortIndex: 5 },
  { value: "R", label: "R", sortIndex: 6 },
  { value: "ITEM", label: "物品", sortIndex: 7 },
  { value: "SUPPORTER", label: "支援者", sortIndex: 8 },
  { value: "STADIUM", label: "場地", sortIndex: 9 },
  { value: "ACE", label: "ACE", sortIndex: 10 },
  { value: "OTHER", label: "其他", sortIndex: 99 },
] as const;

export type RarityTier = (typeof RARITY_TIERS)[number]["value"];

/** 卡牌類型（寶可夢 / 訓練家 / 物品等） */
export const CARD_CATEGORIES = [
  { value: "POKEMON", label: "寶可夢" },
  { value: "TRAINER", label: "訓練家" },
  { value: "ITEM", label: "物品" },
  { value: "ENERGY", label: "能量" },
  { value: "STADIUM", label: "場地" },
] as const;

export type CardCategory = (typeof CARD_CATEGORIES)[number]["value"];

/** 寶可夢屬性 */
export const POKEMON_ATTRIBUTES = [
  { value: "草", label: "草" },
  { value: "火", label: "火" },
  { value: "水", label: "水" },
  { value: "雷", label: "雷" },
  { value: "超", label: "超" },
  { value: "惡", label: "惡" },
  { value: "鬥", label: "鬥" },
  { value: "鋼", label: "鋼" },
  { value: "妖", label: "妖" },
  { value: "龍", label: "龍" },
  { value: "無", label: "無" },
] as const;

export function getCardCategoryLabel(value?: string | null): string {
  if (!value) return "—";
  return CARD_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const SET_SORT_MAP = Object.fromEntries(
  SET_SERIES_CODES.map((s) => [s.value, s.sortIndex]),
) as Record<string, number>;

const RARITY_SORT_MAP = Object.fromEntries(
  RARITY_TIERS.map((r) => [r.value, r.sortIndex]),
) as Record<string, number>;

const SET_PREFIX_ALIASES: Record<string, SetSeriesCode> = {
  M3: "M3",
  M2A: "M2A",
  M2: "M2",
  M1S: "M1S",
  M1L: "M1L",
  M1: "M1",
  SV8A: "SV8",
  SV8: "SV8",
  SV7: "SV7",
  SV6: "SV6",
  SV5: "SV5",
  SV4A: "SV4",
  SV4: "SV4",
  SV3: "SV3",
  SV2A: "SV2",
  SV2: "SV2",
  SV1A: "SV1",
  SV1: "SV1",
  S12A: "S12",
  S12: "S12",
  S11A: "S11",
  S11: "S11",
};

/** 從卡號 ID 推斷系列編號（如 SV3-198 → SV3） */
export function inferSetCodeFromCardId(
  externalCardId?: string | null,
): SetSeriesCode {
  if (!externalCardId) return "OTHER";
  const prefix = externalCardId.split("-")[0]?.toUpperCase() ?? "";
  if (SET_PREFIX_ALIASES[prefix]) return SET_PREFIX_ALIASES[prefix];
  const m = prefix.match(/^(M\d+[A-Z]?|SV\d+[A-Z]?|S\d+[A-Z]?)/i);
  if (m) {
    const key = m[1].toUpperCase();
    if (SET_PREFIX_ALIASES[key]) return SET_PREFIX_ALIASES[key];
    const short = key.replace(/A$/, "");
    if (SET_PREFIX_ALIASES[short]) return SET_PREFIX_ALIASES[short];
  }
  return "OTHER";
}

export function getSetSortIndex(code?: string | null): number {
  if (!code) return 999;
  return SET_SORT_MAP[code] ?? 999;
}

export function getRaritySortIndex(tier?: string | null): number {
  if (!tier) return 99;
  return RARITY_SORT_MAP[tier] ?? 99;
}

export function getSetSeriesLabel(code?: string | null): string {
  if (!code) return "—";
  return SET_SERIES_CODES.find((s) => s.value === code)?.label ?? code;
}

export function getRarityTierLabel(tier?: string | null): string {
  if (!tier) return "—";
  return RARITY_TIERS.find((r) => r.value === tier)?.label ?? tier;
}

/** 從 API 稀有度文字或卡名推斷稀有度分類 */
export function inferRarityTier(
  rarity?: string | null,
  name?: string | null,
  category?: string | null,
): RarityTier {
  const text = `${rarity ?? ""} ${name ?? ""} ${category ?? ""}`.toLowerCase();

  if (/master\s*ultra|夢幻超級|mur/i.test(text)) return "MUR";
  if (/special\s*illustration|特別插圖|sar/i.test(text)) return "SAR";
  if (/hyper\s*secret|超級稀有|secret\s*rare/i.test(text)) return "SR";
  if (/ultra\s*secret|超稀有|ultra\s*rare|雙倍稀有|double\s*rare/i.test(text))
    return "SR";
  if (/illustration\s*rare|插圖稀有|\bar\b/i.test(text)) return "AR";
  if (/雙倍稀有|double\s*rare|\brr\b/i.test(text)) return "RR";
  if (/reverse|逆閃|閃|r\s*閃|r_shiny/i.test(text)) return "R_SHINY";
  if (/支援者|supporter|訓練家/i.test(text)) return "SUPPORTER";
  if (/場地|stadium/i.test(text)) return "STADIUM";
  if (/物品|item|道具/i.test(text)) return "ITEM";
  if (/\bace\b/i.test(text)) return "ACE";
  if (/普通|不常見|common|uncommon|\br\b/i.test(text)) return "R";

  return "OTHER";
}

export function taxonomyFromCard(input: {
  externalCardId?: string | null;
  rarity?: string | null;
  name?: string | null;
  category?: string | null;
  setCode?: string | null;
  rarityTier?: string | null;
}) {
  const setCode =
    (input.setCode as SetSeriesCode) ||
    inferSetCodeFromCardId(input.externalCardId);
  const rarityTier =
    (input.rarityTier as RarityTier) ||
    inferRarityTier(input.rarity, input.name, input.category);

  return {
    setCode,
    rarityTier,
    setSortIndex: getSetSortIndex(setCode),
    raritySortIndex: getRaritySortIndex(rarityTier),
  };
}
