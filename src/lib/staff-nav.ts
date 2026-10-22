/**
 * Overview sidebar. 倉存 is not its own item here.
 * The stock screen stays on the cashier tabs; 商品名單 sits under 收銀帳務.
 */
export const MERCHANT_SIDEBAR_LINKS = [
  { href: "/admin", label: "總覽", exact: true },
  { href: "/admin/taxonomy", label: "標籤管理" },
  { href: "/admin/catalog", label: "卡表目錄" },
  { href: "/admin/data", label: "商品 CSV" },
  { href: "/admin/accounts", label: "帳戶" },
  { href: "/admin/content", label: "網站內容" },
  { href: "/admin/tournaments", label: "店賽報名" },
] as const;

/** Links nested under the 收銀帳務 entry in the overview sidebar. */
export const CASHIER_SIDEBAR_LINKS = [{ href: "/admin/products", label: "商品名單" }] as const;

export const POS_TABS = [
  { href: "/pos", label: "收銀", id: "register" },
  { href: "/pos/receiving", label: "倉存", id: "receiving" },
  { href: "/pos/buyback", label: "收卡", id: "buyback" },
  { href: "/pos/pnl", label: "損益表", id: "pnl" },
  { href: "/pos/orders", label: "交易紀錄", id: "orders" },
  { href: "/pos/scoreboard", label: "計分板", id: "scoreboard" },
] as const;

export type PosTabId = (typeof POS_TABS)[number]["id"];

/** Loyalty and coupon modules stay off the merchant/staff navigation. */
export const STAFF_NAV_EXCLUDED = ["會員管理", "積分管理", "優惠劵", "優惠券"] as const;
