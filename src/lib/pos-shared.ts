export const PAYMENT_METHODS = ["CASH", "PAYME", "FPS", "CARD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = ["GOODS", "RENT", "WAGES", "SUPPLIES", "UTILITIES", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "現金",
  PAYME: "PayMe",
  FPS: "轉數快",
  CARD: "信用卡",
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  GOODS: "進貨",
  RENT: "租金",
  WAGES: "薪金",
  SUPPLIES: "用品",
  UTILITIES: "水電",
  OTHER: "其他",
};

export type SaleItem = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type Sale = {
  id: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  discount: number;
  note: string;
  voided: boolean;
  items: SaleItem[];
};

export type Expense = {
  id: string;
  createdAt: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
};

export type Receipt = {
  id: string;
  createdAt: string;
  productId: string;
  variantId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  expenseId: string;
};

export type Ledger = {
  sales: Sale[];
  expenses: Expense[];
  receipts: Receipt[];
};

export type DailySalePoint = {
  date: string;
  label: string;
  caption: string;
  saleCount: number;
  revenue: number;
};

export type PnlSummary = {
  from: string;
  to: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  netProfit: number;
  netMargin: number;
  saleCount: number;
  byPayment: { method: PaymentMethod; label: string; amount: number }[];
  byExpense: { category: ExpenseCategory; label: string; amount: number }[];
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function saleTotal(sale: Pick<Sale, "items" | "discount">) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.max(0, roundMoney(subtotal - sale.discount));
}

export function saleCost(sale: Pick<Sale, "items">) {
  return roundMoney(sale.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0));
}

export type SaleDraftInput = {
  paymentMethod: string;
  discount?: number;
  note?: string;
  items: { name: string; sku?: string | null; quantity: number; unitPrice: number; unitCost: number }[];
};

function parseMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return roundMoney(amount);
}

/** Validates a checkout payload and builds the sale record. Persistence is separate. */
export function prepareSale(input: SaleDraftInput): { ok: true; sale: Sale } | { ok: false; error: string } {
  if (!PAYMENT_METHODS.includes(input.paymentMethod as PaymentMethod)) {
    return { ok: false, error: "請選擇付款方式" };
  }
  const discount = parseMoney(input.discount ?? 0);
  if (discount == null) return { ok: false, error: "折扣不正確" };

  const items: SaleItem[] = [];
  for (const raw of input.items) {
    const name = raw.name?.trim();
    const quantity = Math.floor(Number(raw.quantity));
    const unitPrice = parseMoney(raw.unitPrice);
    const unitCost = parseMoney(raw.unitCost);
    if (!name || quantity < 1 || unitPrice == null || unitCost == null) {
      return { ok: false, error: "請檢查貨品名稱、數量、售價和成本" };
    }
    items.push({
      id: crypto.randomUUID(),
      name,
      sku: raw.sku?.trim() || null,
      quantity,
      unitPrice,
      unitCost,
    });
  }
  if (items.length === 0) return { ok: false, error: "請先加入貨品" };

  return {
    ok: true,
    sale: {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      paymentMethod: input.paymentMethod as PaymentMethod,
      discount,
      note: input.note?.trim() ?? "",
      voided: false,
      items,
    },
  };
}
