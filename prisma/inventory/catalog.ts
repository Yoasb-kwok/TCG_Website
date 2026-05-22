/** 現有售賣封盒／補充包（價格及庫存由 seed 設為 0，請於後台更新） */
export const SEALED_CATALOG = [
  {
    setId: "sv3pt5",
    productName: "Scarlet & Violet—151 精英訓練家禮盒",
    type: "SEALED_BOX" as const,
  },
  {
    setId: "sv3pt5",
    productName: "Scarlet & Violet—151 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv8pt5",
    productName: "Prismatic Evolutions 精英訓練家禮盒",
    type: "SEALED_BOX" as const,
  },
  {
    setId: "sv8pt5",
    productName: "Prismatic Evolutions 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv6pt5",
    productName: "Shrouded Fable 精英訓練家禮盒",
    type: "SEALED_BOX" as const,
  },
  {
    setId: "sv6pt5",
    productName: "Shrouded Fable 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv9",
    productName: "Journey Together 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv10",
    productName: "Destined Rivals 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv7",
    productName: "Stellar Crown 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv6",
    productName: "Twilight Masquerade 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv5",
    productName: "Temporal Forces 補充包",
    type: "BOOSTER_PACK" as const,
  },
  {
    setId: "sv4",
    productName: "Paradox Rift 補充包",
    type: "BOOSTER_PACK" as const,
  },
] as const;

/** H / I / J 規制標記（標準賽現行環境）— 上架所有 ex 單卡 */
export const REGULATION_MARKS = ["H", "I", "J"] as const;
