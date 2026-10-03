"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PosNav } from "@/components/pos/pos-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatPrice } from "@/lib/format";
import {
  EXPENSE_LABELS,
  type Expense,
  type ExpenseCategory,
  type PnlSummary,
  type Sale,
} from "@/lib/pos-shared";

const PERIODS = [
  { id: "today", label: "今日" },
  { id: "week", label: "本週" },
  { id: "month", label: "本月" },
  { id: "year", label: "今年" },
] as const;

const CATEGORIES = Object.entries(EXPENSE_LABELS) as [ExpenseCategory, string][];

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function PnlReport() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("month");
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({ category: "RENT" as ExpenseCategory, amount: "", note: "" });
  const [error, setError] = useState("");

  const load = async (next = period) => {
    const res = await fetch(`/api/pos?period=${next}`);
    const data = (await res.json()) as { pnl: PnlSummary; sales: Sale[]; expenses: Expense[] };
    setPnl(data.pnl);
    setSales(data.sales ?? []);
    setExpenses(data.expenses ?? []);
  };

  useEffect(() => {
    load(period).catch(() => undefined);
  }, [period]);

  const addExpense = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/pos/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        amount: Number(form.amount),
        note: form.note,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "未能儲存開支");
      return;
    }
    setForm({ category: form.category, amount: "", note: "" });
    await load();
  };

  const removeExpense = async (id: string) => {
    await fetch(`/api/pos/expenses?id=${id}`, { method: "DELETE" });
    await load();
  };

  const cards = pnl
    ? [
        { label: "營業額", value: pnl.revenue, hint: `${pnl.saleCount} 張單` },
        { label: "銷貨成本", value: pnl.cogs, hint: "按每件成本" },
        { label: "毛利", value: pnl.grossProfit, hint: pnl.revenue > 0 ? pct(pnl.grossMargin) : "未有營業額" },
        { label: "開支", value: pnl.expenses, hint: "租金、薪金等" },
        { label: "純利", value: pnl.netProfit, hint: pnl.revenue > 0 ? pct(pnl.netMargin) : "未有營業額" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PosNav current="pnl" />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">損益表</h1>
          <p className="mt-1 text-sm text-muted-foreground">純利 = 營業額 − 銷貨成本 − 開支。作廢單據不算在內。</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`h-8 rounded-lg px-3 text-sm ${
                period === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${card.value < 0 ? "text-red-400" : ""}`}>
              {formatPrice(card.value)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-semibold">開支</h2>
          <form onSubmit={addExpense} className="mt-3 grid gap-2 sm:grid-cols-[8rem_7rem_1fr_auto]">
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="金額"
              required
            />
            <Input
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder="備註，例如三月租金"
            />
            <Button type="submit">記入</Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <ul className="mt-4 divide-y divide-border">
            {expenses.length === 0 && <li className="py-3 text-sm text-muted-foreground">這段時間未有開支</li>}
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p>
                    {EXPENSE_LABELS[expense.category]} · {formatPrice(expense.amount)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDate(expense.createdAt)}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </p>
                </div>
                <button type="button" className="text-xs text-red-400" onClick={() => removeExpense(expense.id)}>
                  刪除
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border p-4">
          <h2 className="font-semibold">銷售</h2>
          {pnl && pnl.byPayment.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {pnl.byPayment.map((row) => `${row.label} ${formatPrice(row.amount)}`).join(" · ")}
            </p>
          )}
          <ul className="mt-3 divide-y divide-border">
            {sales.filter((sale) => !sale.voided).length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">這段時間未有銷售</li>
            )}
            {sales
              .filter((sale) => !sale.voided)
              .map((sale) => {
                const revenue = Math.max(
                  0,
                  sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - sale.discount,
                );
                const cost = sale.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
                return (
                  <li key={sale.id} className="py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <p>{sale.items.map((item) => item.name).join("、")}</p>
                      <p className="tabular-nums">{formatPrice(revenue)}</p>
                    </div>
                    <p className="text-muted-foreground">
                      {formatDate(sale.createdAt)} · 成本 {formatPrice(cost)} · 毛利 {formatPrice(revenue - cost)}
                    </p>
                  </li>
                );
              })}
          </ul>
        </section>
      </div>
    </div>
  );
}
