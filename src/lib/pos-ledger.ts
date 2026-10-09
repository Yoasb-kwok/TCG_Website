import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { dayCaption, dayKey, eachLocalDay, seriesDayLabel, trendWindow } from "@/lib/chart-days";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  prepareSale,
  roundMoney,
  saleCost,
  saleTotal,
  type DailySalePoint,
  type Expense,
  type ExpenseCategory,
  type Ledger,
  type PaymentMethod,
  type PnlSummary,
  type Receipt,
  type Sale,
  type SaleDraftInput,
  type SaleItem,
} from "@/lib/pos-shared";

export type { DailySalePoint, Expense, ExpenseCategory, Ledger, PaymentMethod, PnlSummary, Receipt, Sale, SaleItem };
export { EXPENSE_LABELS, PAYMENT_LABELS, saleCost, saleTotal };

const filePath = path.join(process.cwd(), "data", "pos-ledger.json");
let writeQueue: Promise<unknown> = Promise.resolve();
const databaseRequired = { ok: false as const, error: "收銀資料庫未設定" };

/** Vercel’s filesystem is read-only, so the JSON ledger is only for local runs without a database. */
function canUseFileLedger() {
  return !process.env.VERCEL && !isDatabaseConfigured();
}

function storeUnavailable() {
  if (isDatabaseConfigured() || canUseFileLedger()) return null;
  return databaseRequired;
}

function emptyLedger(): Ledger {
  return { sales: [], expenses: [], receipts: [] };
}

function money(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return roundMoney(amount);
}

type SaleRow = {
  id: string;
  createdAt: Date;
  paymentMethod: string;
  discount: number;
  note: string;
  voided: boolean;
  items: {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    sortIndex: number;
  }[];
};

type ExpenseRow = {
  id: string;
  createdAt: Date;
  category: string;
  amount: number;
  note: string;
};

type ReceiptRow = {
  id: string;
  createdAt: Date;
  productId: string;
  variantId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  expenseId: string;
};

function toSale(row: SaleRow): Sale {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    paymentMethod: row.paymentMethod as PaymentMethod,
    discount: row.discount,
    note: row.note,
    voided: row.voided,
    items: [...row.items]
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
      })),
  };
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    category: row.category as ExpenseCategory,
    amount: row.amount,
    note: row.note,
  };
}

function toReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    productId: row.productId,
    variantId: row.variantId,
    name: row.name,
    sku: row.sku,
    quantity: row.quantity,
    unitCost: row.unitCost,
    unitPrice: row.unitPrice,
    expenseId: row.expenseId,
  };
}

async function readLedgerFromFile(): Promise<Ledger> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Ledger>;
    return {
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
    };
  } catch {
    return emptyLedger();
  }
}

async function readLedgerFromDb(): Promise<Ledger> {
  const prisma = getPrisma();
  const [sales, expenses, receipts] = await Promise.all([
    prisma.posSale.findMany({
      include: { items: { orderBy: { sortIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.posExpense.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.posReceipt.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return {
    sales: sales.map(toSale),
    expenses: expenses.map(toExpense),
    receipts: receipts.map(toReceipt),
  };
}

export async function readLedger(): Promise<Ledger> {
  if (isDatabaseConfigured()) return readLedgerFromDb();
  return readLedgerFromFile();
}

async function updateFileLedger(update: (ledger: Ledger) => Ledger | Promise<Ledger>) {
  let next = emptyLedger();
  const run = writeQueue.then(async () => {
    const current = await readLedgerFromFile();
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

function saleItemsData(sale: Sale) {
  return sale.items.map((item, sortIndex) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
    sortIndex,
  }));
}

async function saveSale(sale: Sale) {
  const prisma = getPrisma();
  await prisma.posSale.create({
    data: {
      id: sale.id,
      createdAt: new Date(sale.createdAt),
      paymentMethod: sale.paymentMethod,
      discount: sale.discount,
      note: sale.note,
      voided: sale.voided,
      items: { create: saleItemsData(sale) },
    },
  });
}

export async function createSale(
  input: SaleDraftInput,
): Promise<{ ok: true; sale: Sale } | { ok: false; error: string }> {
  const prepared = prepareSale(input);
  if (!prepared.ok) return prepared;
  if (storeUnavailable()) return databaseRequired;
  if (!isDatabaseConfigured()) {
    await updateFileLedger((ledger) => ({ ...ledger, sales: [prepared.sale, ...ledger.sales] }));
    return prepared;
  }
  await saveSale(prepared.sale);
  return prepared;
}

export async function voidSale(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (storeUnavailable()) return databaseRequired;
  if (!isDatabaseConfigured()) {
    let found = false;
    await updateFileLedger((ledger) => ({
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

  const prisma = getPrisma();
  const existing = await prisma.posSale.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "找不到這張單" };
  await prisma.posSale.update({ where: { id }, data: { voided: true } });
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
  if (storeUnavailable()) return databaseRequired;
  if (!isDatabaseConfigured()) {
    await updateFileLedger((ledger) => ({ ...ledger, expenses: [expense, ...ledger.expenses] }));
    return { ok: true, expense };
  }
  const prisma = getPrisma();
  await prisma.posExpense.create({
    data: {
      id: expense.id,
      createdAt,
      category: expense.category,
      amount: expense.amount,
      note: expense.note,
    },
  });
  return { ok: true, expense };
}

export async function createReceipt(input: {
  productId: string;
  variantId: string;
  name: string;
  sku?: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
}): Promise<{ ok: true; receipt: Receipt } | { ok: false; error: string }> {
  const name = input.name.trim();
  const quantity = Math.floor(Number(input.quantity));
  const unitCost = money(input.unitCost);
  const unitPrice = money(input.unitPrice);
  if (!name || !input.productId || !input.variantId || quantity < 1 || unitCost == null || unitPrice == null) {
    return { ok: false, error: "請填寫數量、成本同售價" };
  }
  const now = new Date().toISOString();
  const expenseId = crypto.randomUUID();
  const receipt: Receipt = {
    id: crypto.randomUUID(),
    createdAt: now,
    productId: input.productId,
    variantId: input.variantId,
    name,
    sku: input.sku?.trim() || null,
    quantity,
    unitCost,
    unitPrice,
    expenseId,
  };
  const expense: Expense = {
    id: expenseId,
    createdAt: now,
    category: "GOODS",
    amount: roundMoney(quantity * unitCost),
    note: `來貨 ${name} × ${quantity}`,
  };
  if (storeUnavailable()) return databaseRequired;
  if (!isDatabaseConfigured()) {
    await updateFileLedger((ledger) => ({
      ...ledger,
      receipts: [receipt, ...ledger.receipts],
      expenses: [expense, ...ledger.expenses],
    }));
    return { ok: true, receipt };
  }
  const prisma = getPrisma();
  const createdAt = new Date(now);
  await prisma.$transaction([
    prisma.posExpense.create({
      data: {
        id: expense.id,
        createdAt,
        category: expense.category,
        amount: expense.amount,
        note: expense.note,
      },
    }),
    prisma.posReceipt.create({
      data: {
        id: receipt.id,
        createdAt,
        productId: receipt.productId,
        variantId: receipt.variantId,
        name: receipt.name,
        sku: receipt.sku,
        quantity: receipt.quantity,
        unitCost: receipt.unitCost,
        unitPrice: receipt.unitPrice,
        expenseId: receipt.expenseId,
      },
    }),
  ]);
  return { ok: true, receipt };
}

export async function deleteReceipt(id: string): Promise<{ ok: true; receipt: Receipt } | { ok: false; error: string }> {
  if (storeUnavailable()) return databaseRequired;
  if (!isDatabaseConfigured()) {
    let removed: Receipt | null = null;
    await updateFileLedger((ledger) => {
      const receipt = ledger.receipts.find((item) => item.id === id);
      if (!receipt) return ledger;
      removed = receipt;
      return {
        ...ledger,
        receipts: ledger.receipts.filter((item) => item.id !== id),
        expenses: ledger.expenses.filter((expense) => expense.id !== receipt.expenseId),
      };
    });
    if (!removed) return { ok: false, error: "找不到這筆來貨" };
    return { ok: true, receipt: removed };
  }

  const prisma = getPrisma();
  const row = await prisma.posReceipt.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "找不到這筆來貨" };
  await prisma.$transaction([
    prisma.posReceipt.delete({ where: { id } }),
    prisma.posExpense.deleteMany({ where: { id: row.expenseId } }),
  ]);
  return { ok: true, receipt: toReceipt(row) };
}

export async function deleteExpense(id: string) {
  if (storeUnavailable()) throw new Error(databaseRequired.error);
  if (!isDatabaseConfigured()) {
    await updateFileLedger((ledger) => ({
      ...ledger,
      expenses: ledger.expenses.filter((expense) => expense.id !== id),
    }));
    return;
  }
  const prisma = getPrisma();
  await prisma.posExpense.deleteMany({ where: { id } });
}

export function periodRange(period: string, now = new Date()) {
  if (period === "14d") return trendWindow(now);
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

export function dailySaleTrend(ledger: Ledger, from: Date, to: Date): DailySalePoint[] {
  const totals = new Map<string, { saleCount: number; revenue: number }>();
  for (const sale of ledger.sales) {
    if (sale.voided) continue;
    const at = new Date(sale.createdAt);
    if (Number.isNaN(at.getTime()) || at < from || at > to) continue;
    const key = dayKey(at);
    const row = totals.get(key) ?? { saleCount: 0, revenue: 0 };
    row.saleCount += 1;
    row.revenue = roundMoney(row.revenue + saleTotal(sale));
    totals.set(key, row);
  }

  const days = eachLocalDay(from, to);
  return days.map((day, index) => {
    const row = totals.get(dayKey(day));
    return {
      date: dayKey(day),
      label: seriesDayLabel(day, index, days),
      caption: dayCaption(day),
      saleCount: row?.saleCount ?? 0,
      revenue: row?.revenue ?? 0,
    };
  });
}
