import type { TaxonomyKind } from "@/lib/taxonomy-types";

export interface DefaultTaxonomyRow {
  kind: TaxonomyKind;
  value: string;
  label: string;
  sortIndex: number;
  parentValue?: string;
}

/** 初次部署時寫入資料庫的預設標籤 */
export const DEFAULT_TAXONOMY_ROWS: DefaultTaxonomyRow[] = [
  ...[
    ["M3", "M3", 0],
    ["M2A", "M2A", 1],
    ["M2", "M2", 2],
    ["M1S", "M1S", 3],
    ["M1L", "M1L", 4],
    ["M1", "M1", 5],
    ["SV8", "SV8", 10],
    ["SV7", "SV7", 11],
    ["SV6", "SV6", 12],
    ["SV5", "SV5", 13],
    ["SV4", "SV4", 14],
    ["SV3", "SV3", 15],
    ["SV2", "SV2", 16],
    ["SV1", "SV1", 17],
    ["S12", "S12", 20],
    ["S11", "S11", 21],
    ["OTHER", "其他系列", 999],
  ].map(([value, label, sortIndex]) => ({
    kind: "SET_CODE" as const,
    value: String(value),
    label: String(label),
    sortIndex: Number(sortIndex),
  })),
  ...[
    ["MUR", "MUR", 0],
    ["SAR", "SAR", 1],
    ["SR", "SR", 2],
    ["AR", "AR", 3],
    ["RR", "RR", 4],
    ["R_SHINY", "R閃", 5],
    ["R", "R", 6],
    ["ITEM", "物品", 7],
    ["SUPPORTER", "支援者", 8],
    ["STADIUM", "場地", 9],
    ["ACE", "ACE", 10],
    ["OTHER", "其他", 99],
  ].map(([value, label, sortIndex]) => ({
    kind: "RARITY" as const,
    value: String(value),
    label: String(label),
    sortIndex: Number(sortIndex),
  })),
  ...[
    ["POKEMON", "寶可夢", 0],
    ["TRAINER", "訓練家", 1],
    ["ITEM", "物品", 2],
    ["ENERGY", "能量", 3],
    ["STADIUM", "場地", 4],
  ].map(([value, label, sortIndex]) => ({
    kind: "CARD_CATEGORY" as const,
    value: String(value),
    label: String(label),
    sortIndex: Number(sortIndex),
  })),
  ...["草", "火", "水", "雷", "超", "惡", "鬥", "鋼", "妖", "龍", "無"].map(
    (value, sortIndex) => ({
      kind: "POKEMON_ATTRIBUTE" as const,
      value,
      label: value,
      sortIndex,
    }),
  ),
  ...[
    ["SINGLE", "單卡", 0],
    ["SEALED_BOX", "封盒", 1],
    ["BOOSTER_PACK", "補充包", 2],
    ["GIFT_BOX", "禮盒", 3],
    ["ACCESSORY", "配件", 4],
  ].map(([value, label, sortIndex]) => ({
    kind: "PRODUCT_TYPE" as const,
    value: String(value),
    label: String(label),
    sortIndex: Number(sortIndex),
  })),
];
