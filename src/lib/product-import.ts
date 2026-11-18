import { taxonomyFromCard } from "@/lib/card-taxonomy";
import { slugifyProduct } from "@/lib/product-slug";

/**
 * 銀豹分類 → Product.type。
 * Product.type 是字串（標籤 PRODUCT_TYPE），不是 Prisma enum。
 * 罐／支沒有現成類型：罐裝飲品不是禮盒，支裝飲品不是配件。
 *
 * 盒裝 → SEALED_BOX（封盒）
 * 包   → BOOSTER_PACK（補充包）
 * PCS  → SINGLE（單件／單卡）。客戶 PCS 也混有週邊，仍照分類欄，不依名稱改判。
 * 罐   → TIN（罐裝）
 * 支   → BOTTLE（支裝）
 *
 * 同名不同條碼各自一筆商品（slug／SKU 含條碼），不合併。
 */

export const CLIENT_CATEGORY_TYPES = {
  "盒裝": "SEALED_BOX",
  "盒装": "SEALED_BOX",
  "包": "BOOSTER_PACK",
  PCS: "SINGLE",
  "罐": "TIN",
  "支": "BOTTLE",
} as const;

export const KNOWN_PRODUCT_TYPES = new Set([
  "SINGLE",
  "SEALED_BOX",
  "BOOSTER_PACK",
  "GIFT_BOX",
  "ACCESSORY",
  "TIN",
  "BOTTLE",
]);

const ENABLED_STATUS = new Set([
  "启用",
  "啟用",
  "enabled",
  "active",
  "上架",
  "true",
  "1",
  "yes",
  "y",
]);

const POSPAL_HEADERS = new Set([
  "分类",
  "分类(必填)",
  "分類",
  "分類(必填)",
  "进货价",
  "进货价(必填)",
  "進貨價",
  "進貨價(必填)",
]);

type Field =
  | "name"
  | "type"
  | "category"
  | "barcode"
  | "extendedBarcode"
  | "stock"
  | "cost"
  | "wholesale"
  | "price"
  | "memberPrice"
  | "memberDiscount"
  | "pointsProduct"
  | "description"
  | "status"
  | "condition"
  | "isFoil"
  | "setCode"
  | "rarityTier"
  | "cardNumber"
  | "cardSet"
  | "rarity"
  | "cardCategory"
  | "pokemonType";

const HEADER_FIELDS: Record<string, Field> = {
  name: "name",
  名称: "name",
  "名称(必填)": "name",
  名稱: "name",
  "名稱(必填)": "name",
  type: "type",
  category: "category",
  分类: "category",
  "分类(必填)": "category",
  分類: "category",
  "分類(必填)": "category",
  barcode: "barcode",
  条码: "barcode",
  條碼: "barcode",
  extendedbarcode: "extendedBarcode",
  扩展条码: "extendedBarcode",
  擴展條碼: "extendedBarcode",
  stock: "stock",
  库存量: "stock",
  庫存量: "stock",
  cost: "cost",
  进货价: "cost",
  "进货价(必填)": "cost",
  進貨價: "cost",
  "進貨價(必填)": "cost",
  wholesale: "wholesale",
  wholesaleprice: "wholesale",
  批发价: "wholesale",
  "批发价(必填)": "wholesale",
  批發價: "wholesale",
  "批發價(必填)": "wholesale",
  price: "price",
  销售价: "price",
  銷售價: "price",
  memberprice: "memberPrice",
  会员价: "memberPrice",
  會員價: "memberPrice",
  memberdiscount: "memberDiscount",
  会员折扣: "memberDiscount",
  會員折扣: "memberDiscount",
  pointsproduct: "pointsProduct",
  积分商品: "pointsProduct",
  積分商品: "pointsProduct",
  description: "description",
  商品描述: "description",
  status: "status",
  商品状态: "status",
  商品狀態: "status",
  condition: "condition",
  isfoil: "isFoil",
  setcode: "setCode",
  raritytier: "rarityTier",
  cardnumber: "cardNumber",
  cardset: "cardSet",
  rarity: "rarity",
  cardcategory: "cardCategory",
  pokemontype: "pokemonType",
};

export interface ImportSnapshot {
  slugs: string[];
  skus: string[];
  variants: Array<{
    variantId: string;
    productId: string;
    barcode: string | null;
    extendedBarcode?: string | null;
    sku: string;
  }>;
}

export interface ImportSortMaps {
  setCode: Record<string, number>;
  rarityTier: Record<string, number>;
}

export interface ImportCommercial {
  cost?: number | null;
  wholesalePrice?: number | null;
  memberPrice?: number | null;
  memberDiscount?: boolean;
  pointsProduct?: boolean;
}

export interface ImportCreateData extends ImportCommercial {
  name: string;
  slug: string;
  type: string;
  description: string | null;
  condition: string;
  isFoil: boolean;
  price: number;
  stock: number;
  sku: string;
  barcode: string | null;
  /** 第二個收銀碼。null 代表這列沒有擴展條碼。 */
  extendedBarcode: string | null;
  cardSet?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
  setCode?: string | null;
  rarityTier?: string | null;
  cardCategory?: string | null;
  setSortIndex?: number;
  raritySortIndex?: number;
  pokemonType?: string | null;
  cost: number | null;
  wholesalePrice: number | null;
  memberPrice: number | null;
  memberDiscount: boolean;
  pointsProduct: boolean;
}

export interface ImportUpdateData extends ImportCommercial {
  productId: string;
  variantId: string;
  name: string;
  type: string;
  price: number;
  stock: number;
  description?: string;
  /** 檔案有這欄時才會出現；null 代表清掉第二個碼。 */
  extendedBarcode?: string | null;
}

export interface ImportQuarantine {
  row: number;
  name: string;
  barcode: string | null;
  reasons: string[];
  message: string;
}

export type ImportDecision =
  | { action: "quarantine"; quarantine: ImportQuarantine }
  | { action: "skip"; row: number }
  | { action: "create"; row: number; data: ImportCreateData }
  | { action: "update"; row: number; data: ImportUpdateData };

export interface ProductImportPlan {
  pospal: boolean;
  decisions: ImportDecision[];
}

const REASON_TEXT: Record<string, string> = {
  missing_name: "缺少商品名稱",
  missing_type: "缺少商品類型",
  unknown_category: "分類無法對應商品類型",
  missing_barcode: "缺少條碼，無法新增或更新",
  missing_set_code: "單卡缺少系列編號 (setCode)",
  missing_rarity: "單卡缺少稀有度 (rarityTier)",
  stock_not_integer: "庫存不是非負整數",
  invalid_price: "售價格式錯誤",
  retail_zero: "售價為 0，不當作可售目錄",
  invalid_cost: "進貨價格式錯誤",
  cost_zero: "進貨價為 0",
  invalid_wholesale: "批發價格式錯誤",
  invalid_member_price: "會員價格式錯誤",
  invalid_flag: "會員折扣或積分商品請填是或否",
  price_below_cost: "批發價或售價低於進貨價",
  service_sku: "服務類貨號（locker/），不是商品目錄",
  inactive: "商品狀態不是啟用",
  duplicate_barcode: "同一檔案內條碼重複，或與另一個主條碼／擴展條碼相同",
  invalid_barcode: "擴展條碼格式不正確",
};

export function normalizeImportHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\u3000/g, "")
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")");
}

/** Map a 银豹 category or an existing Product.type value. Unknown text returns null. */
export function mapClientCategory(raw: string): string | null {
  const compact = raw.trim().replace(/\s+/g, "");
  if (!compact) return null;
  if (compact.toUpperCase() === "PCS") return "SINGLE";
  const mapped = CLIENT_CATEGORY_TYPES[compact as keyof typeof CLIENT_CATEGORY_TYPES];
  if (mapped) return mapped;
  const upper = compact.toUpperCase();
  if (KNOWN_PRODUCT_TYPES.has(upper)) return upper;
  return null;
}

export function isServiceSkuName(name: string): boolean {
  return /^locker\//i.test(name.trim());
}

function reasonMessage(reasons: string[], details: Record<string, string>): string {
  return reasons
    .map((reason) => {
      const label = REASON_TEXT[reason] ?? reason;
      const detail = details[reason];
      return detail ? `${label}：${detail}` : label;
    })
    .join("；");
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseMoney(raw: string): number | null {
  const text = raw.trim().replace(/,/g, "").replace(/^(hkd|hk\$|\$|￥|¥)/i, "");
  if (!text || !/^-?\d+(\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return roundMoney(value);
}

function parseStock(raw: string): number | null {
  const text = raw.trim().replace(/,/g, "");
  if (!text || !/^-?\d+(\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  if (Math.abs(value - Math.round(value)) > 1e-6) return null;
  const stock = Math.round(value);
  if (!Number.isSafeInteger(stock)) return null;
  return stock;
}

function parseFlag(raw: string): boolean | null | undefined {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  if (["是", "true", "1", "yes", "y"].includes(text)) return true;
  if (["否", "false", "0", "no", "n"].includes(text)) return false;
  return undefined;
}

function parseBoolean(raw: string): boolean {
  return ["true", "1", "yes", "y", "是", "閃"].includes(raw.trim().toLowerCase());
}

function conditionFor(type: string, explicit: string): string {
  const given = explicit.trim();
  if (given) return given;
  if (type === "SINGLE") return "Near Mint (NM)";
  if (type === "ACCESSORY" || type === "TIN" || type === "BOTTLE") return "New";
  return "Sealed";
}

function cell(row: string[], index: number | undefined): string {
  if (index == null) return "";
  return (row[index] ?? "").trim();
}

function snippet(raw: string): string {
  const text = raw.trim();
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

interface ColumnIndex {
  pospal: boolean;
  fields: Partial<Record<Field, number>>;
}

function indexColumns(headers: string[]): ColumnIndex {
  const fields: Partial<Record<Field, number>> = {};
  const normalized = headers.map((header) => normalizeImportHeader(header));
  normalized.forEach((header, index) => {
    const field = HEADER_FIELDS[header];
    if (!field || fields[field] != null) return;
    fields[field] = index;
  });
  return {
    pospal: normalized.some((header) => POSPAL_HEADERS.has(header)),
    fields,
  };
}

function blankRow(row: string[]): boolean {
  return row.every((value) => !value.trim());
}

function uniqueSlug(name: string, suffix: string, taken: Set<string>): string {
  const base = slugifyProduct(name, suffix) || slugifyProduct("item", suffix) || `item-${suffix}`;
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const next = slugifyProduct(name, `${suffix}-${n}`) || `${base}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `${base}-${taken.size}`;
}

export function classifyProductRows(
  table: string[][],
  existing: ImportSnapshot,
  sortMaps?: ImportSortMaps,
): ProductImportPlan {
  if (table.length === 0) return { pospal: false, decisions: [] };
  const columns = indexColumns(table[0] ?? []);
  const takenSlugs = new Set(existing.slugs);
  const takenSkus = new Set(existing.skus);
  const byBarcode = new Map<string, ImportSnapshot["variants"][number]>();
  const codeOwners = new Map<string, string>();
  for (const variant of existing.variants) {
    const barcode = variant.barcode?.trim().toLowerCase();
    const extended = variant.extendedBarcode?.trim().toLowerCase();
    if (barcode) {
      byBarcode.set(barcode, variant);
      codeOwners.set(barcode, variant.variantId);
    }
    if (extended) codeOwners.set(extended, variant.variantId);
  }
  const acceptedBarcodes = new Set<string>();
  const decisions: ImportDecision[] = [];

  table.slice(1).forEach((sourceRow, index) => {
    const rowNumber = index + 2;
    if (blankRow(sourceRow)) return;
    const read = (field: Field) => cell(sourceRow, columns.fields[field]);
    const present = (field: Field) => columns.fields[field] != null;
    const reasons: string[] = [];
    const details: Record<string, string> = {};

    const name = read("name");
    if (!name) reasons.push("missing_name");
    if (name && isServiceSkuName(name)) reasons.push("service_sku");

    const typeText = present("type") ? read("type") : "";
    const categoryText = present("category") ? read("category") : "";
    let productType = typeText ? mapClientCategory(typeText) : null;
    if (!productType && categoryText) productType = mapClientCategory(categoryText);
    if (!productType) {
      reasons.push(typeText || categoryText ? "unknown_category" : "missing_type");
    }

    const barcode = read("barcode");
    if (columns.pospal && !barcode) reasons.push("missing_barcode");
    const barcodeKey = barcode.toLowerCase();
    if (barcode && (acceptedBarcodes.has(barcodeKey) || !usableCode(barcode))) {
      reasons.push(usableCode(barcode) ? "duplicate_barcode" : "invalid_barcode");
    }
    const primaryOwner = barcode ? codeOwners.get(barcodeKey) : undefined;
    const primaryMatch = barcode ? byBarcode.get(barcodeKey) : undefined;
    if (primaryOwner && primaryOwner !== primaryMatch?.variantId) reasons.push("duplicate_barcode");

    let extendedBarcode: string | null | undefined;
    if (present("extendedBarcode")) {
      const extendedRaw = read("extendedBarcode");
      if (!extendedRaw) {
        extendedBarcode = null;
      } else if (!usableCode(extendedRaw)) {
        reasons.push("invalid_barcode");
        details.invalid_barcode = snippet(extendedRaw);
      } else {
        const extendedKey = extendedRaw.toLowerCase();
        const extendedOwner = codeOwners.get(extendedKey);
        if (extendedKey === barcodeKey) {
          extendedBarcode = null;
        } else if (
          acceptedBarcodes.has(extendedKey) ||
          (extendedOwner && extendedOwner !== primaryMatch?.variantId)
        ) {
          reasons.push("duplicate_barcode");
          extendedBarcode = extendedRaw;
        } else {
          extendedBarcode = extendedRaw;
        }
      }
    }

    const priceText = present("price") ? read("price") : "";
    let price: number | null = null;
    if (!present("price") || !priceText) {
      reasons.push("invalid_price");
    } else {
      price = parseMoney(priceText);
      if (price == null || price < 0) {
        reasons.push("invalid_price");
        details.invalid_price = snippet(priceText);
        price = null;
      } else if (price === 0) {
        reasons.push("retail_zero");
      }
    }

    const stockText = present("stock") ? read("stock") : "";
    let stock = 0;
    if (present("stock") && stockText) {
      const parsed = parseStock(stockText);
      if (parsed == null) {
        reasons.push("stock_not_integer");
        details.stock_not_integer = snippet(stockText);
      } else {
        stock = parsed;
      }
    } else if (present("stock") && columns.pospal) {
      reasons.push("stock_not_integer");
    }

    let cost: number | null | undefined;
    if (present("cost")) {
      const raw = read("cost");
      if (!raw) {
        cost = undefined;
      } else {
        const parsed = parseMoney(raw);
        if (parsed == null || parsed < 0) {
          reasons.push("invalid_cost");
          details.invalid_cost = snippet(raw);
        } else if (parsed === 0) {
          reasons.push("cost_zero");
          cost = 0;
        } else {
          cost = parsed;
        }
      }
    }

    let wholesale: number | null | undefined;
    if (present("wholesale")) {
      const raw = read("wholesale");
      if (!raw) {
        wholesale = undefined;
      } else {
        const parsed = parseMoney(raw);
        if (parsed == null || parsed < 0) {
          reasons.push("invalid_wholesale");
          details.invalid_wholesale = snippet(raw);
        } else {
          wholesale = parsed;
        }
      }
    }

    let memberPrice: number | null | undefined;
    if (present("memberPrice")) {
      const raw = read("memberPrice");
      if (!raw) {
        memberPrice = undefined;
      } else {
        const parsed = parseMoney(raw);
        if (parsed == null || parsed < 0) {
          reasons.push("invalid_member_price");
          details.invalid_member_price = snippet(raw);
        } else {
          memberPrice = parsed;
        }
      }
    }

    let memberDiscount: boolean | undefined;
    let pointsProduct: boolean | undefined;
    if (present("memberDiscount")) {
      const parsed = parseFlag(read("memberDiscount"));
      if (parsed === undefined) reasons.push("invalid_flag");
      else if (parsed != null) memberDiscount = parsed;
    }
    if (present("pointsProduct")) {
      const parsed = parseFlag(read("pointsProduct"));
      if (parsed === undefined) {
        if (!reasons.includes("invalid_flag")) reasons.push("invalid_flag");
      } else if (parsed != null) pointsProduct = parsed;
    }

    if (
      cost != null &&
      cost > 0 &&
      ((wholesale != null && wholesale < cost) || (price != null && price < cost))
    ) {
      reasons.push("price_below_cost");
    }

    if (present("status")) {
      const status = read("status").trim().toLowerCase();
      if (status && !ENABLED_STATUS.has(status)) reasons.push("inactive");
    }

    const legacySingle = !columns.pospal && productType === "SINGLE";
    if (legacySingle && !read("setCode")) reasons.push("missing_set_code");
    if (legacySingle && !read("rarityTier")) reasons.push("missing_rarity");

    if (reasons.length > 0) {
      decisions.push({
        action: "quarantine",
        quarantine: {
          row: rowNumber,
          name,
          barcode: barcode || null,
          reasons,
          message: reasonMessage(reasons, details),
        },
      });
      return;
    }

    if (barcode) acceptedBarcodes.add(barcodeKey);
    if (extendedBarcode) acceptedBarcodes.add(extendedBarcode.toLowerCase());
    const resolvedType = productType ?? "ACCESSORY";
    const matched = barcode ? byBarcode.get(barcodeKey) : undefined;
    const descriptionCell = present("description") ? read("description") : "";

    if (matched) {
      const update: ImportUpdateData = {
        productId: matched.productId,
        variantId: matched.variantId,
        name,
        type: resolvedType,
        price: price ?? 0,
        stock,
      };
      if (descriptionCell) update.description = descriptionCell;
      if (cost !== undefined) update.cost = cost;
      if (wholesale !== undefined) update.wholesalePrice = wholesale;
      if (memberPrice !== undefined) update.memberPrice = memberPrice;
      if (memberDiscount !== undefined) update.memberDiscount = memberDiscount;
      if (pointsProduct !== undefined) update.pointsProduct = pointsProduct;
      if (extendedBarcode !== undefined) update.extendedBarcode = extendedBarcode;
      decisions.push({ action: "update", row: rowNumber, data: update });
      return;
    }

    const isFoil = parseBoolean(read("isFoil"));
    const slug = barcode
      ? uniqueSlug(name, barcode, takenSlugs)
      : slugifyProduct(name, slugForLegacy(resolvedType, read("setCode"), read("cardNumber"), rowNumber));
    const sku = barcode
      ? uniqueSku(barcode, takenSkus)
      : `${slug}-${skuSuffixFor(resolvedType, isFoil)}`.slice(0, 64);

    if (!barcode && (!slug || takenSlugs.has(slug) || takenSkus.has(sku))) {
      decisions.push({ action: "skip", row: rowNumber });
      return;
    }

    takenSlugs.add(slug);
    takenSkus.add(sku);

    const data: ImportCreateData = {
      name,
      slug,
      type: resolvedType,
      description: null,
      condition: conditionFor(resolvedType, present("condition") ? read("condition") : ""),
      isFoil,
      price: price ?? 0,
      stock,
      sku,
      barcode: barcode || null,
      extendedBarcode: extendedBarcode ?? null,
      cost: cost ?? null,
      wholesalePrice: wholesale ?? null,
      memberPrice: memberPrice ?? null,
      memberDiscount: memberDiscount ?? false,
      pointsProduct: pointsProduct ?? false,
    };

    if (!columns.pospal && (resolvedType === "SINGLE" || read("setCode"))) {
      const setCode = read("setCode");
      const rarityTier = read("rarityTier");
      const taxonomy = taxonomyFromCard({
        setCode: setCode || null,
        rarityTier: rarityTier || null,
        name,
      });
      if (resolvedType === "SINGLE") {
        const cardNumber = read("cardNumber");
        const cardCategory = read("cardCategory") || "POKEMON";
        const pokemonType = read("pokemonType") || null;
        data.cardSet = read("cardSet") || setCode || null;
        data.cardNumber = cardNumber || null;
        data.rarity = read("rarity") || rarityTier || null;
        data.setCode = taxonomy.setCode;
        data.rarityTier = taxonomy.rarityTier;
        data.cardCategory = cardCategory;
        data.pokemonType = pokemonType;
        data.setSortIndex = sortMaps?.setCode[taxonomy.setCode] ?? taxonomy.setSortIndex;
        data.raritySortIndex = sortMaps?.rarityTier[taxonomy.rarityTier] ?? taxonomy.raritySortIndex;
        data.description = storedDescription(
          descriptionCell,
          [setCode, cardNumber ? `#${cardNumber}` : null, cardCategory, pokemonType].filter(Boolean).join(" · ") || null,
        );
      } else if (setCode) {
        data.cardSet = read("cardSet") || setCode;
        data.setCode = taxonomy.setCode;
        data.setSortIndex = sortMaps?.setCode[taxonomy.setCode] ?? taxonomy.setSortIndex;
        data.description = storedDescription(descriptionCell, null);
      }
    } else if (descriptionCell) {
      data.description = descriptionCell;
    }

    decisions.push({ action: "create", row: rowNumber, data });
  });

  return { pospal: columns.pospal, decisions };
}

function usableCode(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 64 && !/[\u0000-\u001f]/.test(trimmed);
}

function storedDescription(cell: string, generated: string | null): string | null {
  const imported = cell.trim();
  if (imported) return imported;
  const fallback = generated?.trim() ?? "";
  return fallback ? fallback : null;
}

function skuSuffixFor(type: string, isFoil: boolean): string {
  if (type === "SINGLE") return isFoil ? "foil" : "nm";
  if (type === "ACCESSORY" || type === "TIN" || type === "BOTTLE") return "acc";
  return "sealed";
}

function slugForLegacy(type: string, setCode: string, cardNumber: string, rowNumber: number): string {
  if (type === "SINGLE") return `${setCode}-${cardNumber || rowNumber}`;
  if (type === "ACCESSORY" || type === "TIN" || type === "BOTTLE") return String(rowNumber);
  return type;
}

function uniqueSku(barcode: string, taken: Set<string>): string {
  if (!taken.has(barcode)) return barcode.slice(0, 64);
  for (let n = 2; n < 1000; n += 1) {
    const next = `${barcode}-${n}`.slice(0, 64);
    if (!taken.has(next)) return next;
  }
  return `${barcode}-${taken.size}`.slice(0, 64);
}
