import { PRODUCT_TYPES } from "@/lib/constants";

export function isSingleProductType(type: string): boolean {
  return type === "SINGLE";
}

/** 配件、罐裝、支裝沒有系列／稀有度，編輯走同一套簡易表單。 */
const SIMPLE_GOODS_TYPES = new Set(["ACCESSORY", "TIN", "BOTTLE"]);

export function isAccessoryProductType(type: string): boolean {
  return SIMPLE_GOODS_TYPES.has(type);
}

/** 卡盒／補充包／禮盒等（非單卡、非配件） */
export function isCardPackProductType(type: string): boolean {
  return !isSingleProductType(type) && !isAccessoryProductType(type);
}

/** 卡盒上架表單可選的商品類型（來自標籤管理，排除單卡與配件） */
export function filterSealedProductTypeOptions<
  T extends { value: string; active?: boolean },
>(options: T[]): T[] {
  return options.filter(
    (o) =>
      (o.active !== false) &&
      o.value !== "SINGLE" &&
      !isAccessoryProductType(o.value),
  );
}

/** 顯示名稱與標籤管理 PRODUCT_TYPE 一致 */
export function getProductTypeDisplayLabel(
  type: string,
  labelFor?: (kind: "PRODUCT_TYPE", value: string) => string,
): string {
  const fromTaxonomy = labelFor?.("PRODUCT_TYPE", type);
  if (fromTaxonomy && fromTaxonomy !== "—") return fromTaxonomy;
  const fallback = PRODUCT_TYPES.find((t) => t.value === type)?.label;
  if (fallback) return fallback;
  return type;
}
