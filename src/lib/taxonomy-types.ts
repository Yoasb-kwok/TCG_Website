export type TaxonomyKind =
  | "SET_CODE"
  | "RARITY"
  | "CARD_NUMBER"
  | "CARD_CATEGORY"
  | "POKEMON_ATTRIBUTE"
  | "PRODUCT_TYPE";

export interface TaxonomyOptionDto {
  id: string;
  kind: TaxonomyKind;
  value: string;
  label: string;
  sortIndex: number;
  parentValue: string | null;
  /** 系列固定後綴（僅 SET_CODE，如 063） */
  cardSuffix?: string | null;
  active: boolean;
}

export const TAXONOMY_KIND_META: Record<
  TaxonomyKind,
  { label: string; valueHint: string; labelHint: string }
> = {
  SET_CODE: {
    label: "系列編號",
    valueHint: "M3",
    labelHint: "M3",
  },
  RARITY: {
    label: "稀有度",
    valueHint: "RR",
    labelHint: "RR",
  },
  CARD_NUMBER: {
    label: "卡號",
    valueHint: "001/063",
    labelHint: "批次產生",
  },
  CARD_CATEGORY: {
    label: "類型",
    valueHint: "POKEMON",
    labelHint: "寶可夢",
  },
  POKEMON_ATTRIBUTE: {
    label: "屬性",
    valueHint: "火",
    labelHint: "火",
  },
  PRODUCT_TYPE: {
    label: "商品類型",
    valueHint: "BOOSTER_PACK",
    labelHint: "補充包",
  },
};

export const ALL_TAXONOMY_KINDS: TaxonomyKind[] = [
  "SET_CODE",
  "RARITY",
  "CARD_NUMBER",
  "CARD_CATEGORY",
  "POKEMON_ATTRIBUTE",
  "PRODUCT_TYPE",
];
