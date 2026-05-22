import { PRODUCT_TYPES } from "@/lib/constants";

export function isSingleProductType(type: string): boolean {
  return type === "SINGLE";
}

export function isAccessoryProductType(type: string): boolean {
  return type === "ACCESSORY";
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
      o.value !== "ACCESSORY",
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
