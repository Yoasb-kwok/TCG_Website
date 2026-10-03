import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  roundMoney,
  saleCost,
  saleTotal,
  type Expense,
  type ExpenseCategory,
  type Ledger,
  type PaymentMethod,
  type PnlSummary,
  type Sale,
  type SaleItem,
} from "@/lib/pos-shared";

export type { Expense, ExpenseCategory, Ledger, PaymentMethod, PnlSummary, Sale, SaleItem };
export { EXPENSE_LABELS, PAYMENT_LABELS, saleCost, saleTotal };

const filePath = path.join(process.cwd(), "data", "pos-ledger.json");
let writeQueue: Promise<unknown> = Promise.resolve();

function emptyLedger(): Ledger {
  return { sales: [], expenses: [] };
}

export async function readLedger(): Promise<Ledger> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Ledger>;
    return {
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    };
  } catch {
    return emptyLedger();
  }
}

async function updateLedger(update: (ledger: Ledger) => Ledger | Promise<Ledger>) {
  let next = emptyLedger();
  const run = writeQueue.then(async () => {
    const current = await readLedger();
    next = await update(current);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  await run;
  return next;
}

function money(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return roundMoney(amount);
}

export async function createSale(input: {
  paymentMethod: string;
  discount?: number;
  note?: string;
  items: { name: string; sku?: string | null; quantity: number; unitPrice: number; unitCost: number }[];
}): Promise<{ ok: true; sale: Sale } | { ok: false; error: string }> {
  if (!PAYMENT_METHODS.includes(input.paymentMethod as PaymentMethod)) {
    return { ok: false, error: "請選擇付款方式" };
  }
  const discount = money(input.discount ?? 0);
  if (discount == null) return { ok: false, error: "折扣不正確" };

  const items: SaleItem[] = [];
  for (const raw of input.items) {
    const name = raw.name?.trim();
    const quantity = Math.floor(Number(raw.quantity));
    const unitPrice = money(raw.unitPrice);
    const unitCost = money(raw.unitCost);
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

  const sale: Sale = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    paymentMethod: input.paymentMethod as PaymentMethod,
    discount,
    note: input.note?.trim() ?? "",
    voided: false,
    items,
  };

  await updateLedger((ledger) => ({ ...ledger, sales: [sale, ...ledger.sales] }));
  return { ok: true, sale };
}

export async function voidSale(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let found = false;
  await updateLedger((ledger) => ({
    ...ledger,
    sales: ledger.sales.map((sale) => {
      if (sale.id !== id) return sale;
      found = true;
      return { ...sale, voided: true };
    }),
  }));
  if (!found) return { ok: false, error: "找不到這張單" };
  return { ok: true };
}

export async function createExpense(input: {
  category: string;
  amount: number;
  note?: string;
  createdAt?: string;
}): Promise<{ ok: true; expense: Expense } | { ok: false; error: string }> {
  if (!EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)) {
    return { ok: false, error: "請選擇開支類別" };
  }
  const amount = money(input.amount);
  if (amount == null || amount <= 0) return { ok: false, error: "請填寫開支金額" };
  const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
  if (Number.isNaN(createdAt.getTime())) return { ok: false, error: "日期不正確" };

  const expense: Expense = {
    id: crypto.randomUUID(),
    createdAt: createdAt.toISOString(),
    category: input.category as ExpenseCategory,
    amount,
    note: input.note?.trim() ?? "",
  };
  await updateLedger((ledger) => ({ ...ledger, expenses: [expense, ...ledger.expenses] }));
  return { ok: true, expense };
}

export async function deleteExpense(id: string) {
  await updateLedger((ledger) => ({
    ...ledger,
    expenses: ledger.expenses.filter((expense) => expense.id !== id),
  }));
}

export function periodRange(period: string, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }
  return { from: start, to: end };
}

export function summarizePnl(ledger: Ledger, from: Date, to: Date): PnlSummary {
  const sales = ledger.sales.filter((sale) => {
    if (sale.voided) return false;
    const at = new Date(sale.createdAt).getTime();
    return at >= from.getTime() && at <= to.getTime();
  });
  const expenses = ledger.expenses.filter((expense) => {
    const at = new Date(expense.createdAt).getTime();
    return at >= from.getTime() && at <= to.getTime();
  });

  const revenue = roundMoney(sales.reduce((sum, sale) => sum + saleTotal(sale), 0));
  const cogs = roundMoney(sales.reduce((sum, sale) => sum + saleCost(sale), 0));
  const grossProfit = roundMoney(revenue - cogs);
  const expenseTotal = roundMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0));
  const netProfit = roundMoney(grossProfit - expenseTotal);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    revenue,
    cogs,
    grossProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    expenses: expenseTotal,
    netProfit,
    netMargin: revenue > 0 ? netProfit / revenue : 0,
    saleCount: sales.length,
    byPayment: PAYMENT_METHODS.map((method) => ({
      method,
      label: PAYMENT_LABELS[method],
      amount: roundMoney(
        sales
          .filter((sale) => sale.paymentMethod === method)
          .reduce((sum, sale) => sum + saleTotal(sale), 0),
      ),
    })).filter((row) => row.amount > 0),
    byExpense: EXPENSE_CATEGORIES.map((category) => ({
      category,
      label: EXPENSE_LABELS[category],
      amount: roundMoney(
        expenses
          .filter((expense) => expense.category === category)
          .reduce((sum, expense) => sum + expense.amount, 0),
      ),
    })).filter((row) => row.amount > 0),
  };
}
