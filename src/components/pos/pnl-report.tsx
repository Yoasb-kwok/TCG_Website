"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { downloadCsv, posBlackBtn, posChip, posInput, posSub, posTitle, posWhen } from "@/components/pos/pos-ui";
import { formatPrice } from "@/lib/format";
import {
  EXPENSE_LABELS,
  roundMoney,
  saleTotal,
  type DailySalePoint,
  type Expense,
  type ExpenseCategory,
  type PnlSummary,
  type Sale,
} from "@/lib/pos-shared";

const PERIODS = [
  { id: "today", label: "今日" },
  { id: "week", label: "本週" },
  { id: "month", label: "本月" },
  { id: "year", label: "本年" },
] as const;

const CATEGORIES = Object.entries(EXPENSE_LABELS) as [ExpenseCategory, string][];

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function PnlReport() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("today");
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trend, setTrend] = useState<DailySalePoint[] | null>(null);
  const [form, setForm] = useState({ category: "RENT" as ExpenseCategory, amount: "", note: "" });
  const [error, setError] = useState("");

  const load = async (next = period) => {
    const res = await fetch(`/api/pos?period=${next}`);
    const data = (await res.json()) as {
      pnl: PnlSummary;
      sales: Sale[];
      expenses: Expense[];
      trend?: DailySalePoint[];
    };
    setPnl(data.pnl);
    setSales(data.sales ?? []);
    setExpenses(data.expenses ?? []);
    setTrend(data.trend ?? []);
  };

  useEffect(() => {
    let ignore = false;
    fetch(`/api/pos?period=${period}`)
      .then((res) => res.json())
      .then((data: { pnl: PnlSummary; sales?: Sale[]; expenses?: Expense[]; trend?: DailySalePoint[] }) => {
        if (ignore) return;
        setPnl(data.pnl);
        setSales(data.sales ?? []);
        setExpenses(data.expenses ?? []);
        setTrend(data.trend ?? []);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
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

  const goods = pnl?.byExpense.find((row) => row.category === "GOODS")?.amount ?? 0;
  const otherSpend = pnl ? roundMoney(Math.max(0, pnl.expenses - goods)) : 0;
  const cards = [
    { label: "銷售收入", value: pnl?.revenue ?? 0, className: "bg-[#e8dfff]" },
    { label: "收購支出", value: goods, className: "bg-[#ffd0a3]" },
    { label: "其他支出", value: otherSpend, className: "bg-white" },
    { label: "估算毛利", value: pnl?.grossProfit ?? 0, className: "bg-[#ddeb9f]" },
  ];

  const hourOf = (iso: string) =>
    Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(iso)),
    );
  const bars =
    period === "today"
      ? Array.from({ length: 10 }, (_, index) => {
          const hour = index + 12;
          const amount = sales
            .filter((sale) => !sale.voided && hourOf(sale.createdAt) === hour)
            .reduce((sum, sale) => sum + saleTotal(sale), 0);
          return { label: `${hour}`, amount };
        })
      : (trend ?? []).map((point) => ({ label: point.label, amount: point.revenue }));
  const maxBar = Math.max(1, ...bars.map((bar) => bar.amount));
  const periodLabel = PERIODS.find((item) => item.id === period)?.label ?? "";

  const exportReport = () => {
    if (!pnl) return;
    downloadCsv(`pos-pnl-${period}.csv`, [
      ["項目", "金額"],
      ["銷售收入", String(pnl.revenue)],
      ["收購支出", String(goods)],
      ["其他支出", String(otherSpend)],
      ["估算毛利", String(pnl.grossProfit)],
      ["純利", String(pnl.netProfit)],
      [],
      ["支出", "時間", "金額", "備註"],
      ...expenses.map((expense) => [
        EXPENSE_LABELS[expense.category],
        posWhen(expense.createdAt),
        String(expense.amount),
        expense.note,
      ]),
      [],
      ["銷售", "時間", "金額"],
      ...sales
        .filter((sale) => !sale.voided)
        .map((sale) => [sale.items.map((item) => item.name).join("、"), posWhen(sale.createdAt), String(saleTotal(sale))]),
    ]);
  };

  return (
    <PosShell current="pnl">
      <div className="h-full overflow-y-auto px-4 py-6 lg:px-16 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>損益表</h1>
            <p className={posSub}>查看營收、收購、支出與毛利，並紀錄店內費用。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={posChip(period === item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={exportReport} className={posBlackBtn}>
            匯出報表
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className={`rounded-[20px] border border-[rgba(222,214,203,0.7)] p-5 shadow-[0_10px_14px_rgba(74,44,22,0.1)] ${card.className}`}>
              <p className={`text-[28px] font-bold tabular-nums ${card.value < 0 ? "text-[#9a3412]" : "text-[#171514]"}`}>
                {formatPrice(card.value)}
              </p>
              <p className="mt-1 text-[14px] text-[#706c68]">{card.label}</p>
            </div>
          ))}
        </div>
        {pnl && (
          <p className="mt-3 text-[13px] text-[#706c68]">
            純利 {formatPrice(pnl.netProfit)}
            {pnl.revenue > 0 ? ` · 毛利率 ${pct(pnl.grossMargin)} · 純利率 ${pct(pnl.netMargin)}` : ""}
            。作廢單據不算在內。收購支出是進貨（收卡同入庫）。
          </p>
        )}

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white p-5 shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
            <h2 className="text-[20px] font-bold">{period === "today" ? "今日現金流" : `${periodLabel}現金流`}</h2>
            <p className="mt-1 text-[14px] text-[#706c68]">
              {period === "today" ? "按小時顯示銷售收入。" : "按日顯示銷售收入。"}
            </p>
            {bars.every((bar) => bar.amount <= 0) ? (
              <p className="mt-8 text-[14px] text-[#706c68]">{trend ? "這段時間未有銷售" : "載入店內銷售…"}</p>
            ) : (
              <div className="mt-6 flex h-48 items-end gap-2">
                {bars.map((bar, index) => (
                  <div key={`${bar.label}-${index}`} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                    <div
                      className="w-full rounded-t-[10px]"
                      style={{
                        height: `${Math.max(8, (bar.amount / maxBar) * 100)}%`,
                        background: index % 2 === 0 ? "#e8dfff" : "#ffd0a3",
                      }}
                      title={`${bar.label} ${formatPrice(bar.amount)}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <form onSubmit={addExpense} className="flex flex-col gap-3 rounded-[20px] bg-[#ffd0a3] p-5">
            <h2 className="text-[20px] font-bold">記錄支出</h2>
            <label className="block text-[13px] font-bold">
              類別
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}
                className={`${posInput} mt-1.5`}
              >
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-bold">
              金額
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="HK$ 0"
                required
                className={`${posInput} mt-1.5`}
              />
            </label>
            <label className="block text-[13px] font-bold">
              備註
              <input
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                placeholder="選填"
                className={`${posInput} mt-1.5`}
              />
            </label>
            {error && <p className="text-[14px] font-bold text-[#9a3412]">{error}</p>}
            <button type="submit" className={posBlackBtn}>
              記入支出
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#faf8f3] text-[13px] text-[#706c68]">
                <tr>
                  <th className="px-4 py-3 font-bold">支出項目</th>
                  <th className="px-4 py-3 font-bold">時間</th>
                  <th className="px-4 py-3 font-bold">金額</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-[#706c68]">這段時間未有開支</td>
                  </tr>
                )}
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-[#ded6cb]">
                    <td className="px-4 py-3">
                      <p className="font-bold">{expense.note || EXPENSE_LABELS[expense.category]}</p>
                      <button type="button" className="text-[12px] font-bold text-[#9a3412]" onClick={() => removeExpense(expense.id)}>
                        刪除
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#706c68]">{posWhen(expense.createdAt)}</td>
                    <td className="px-4 py-3 font-bold">{formatPrice(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-hidden rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#faf8f3] text-[13px] text-[#706c68]">
                <tr>
                  <th className="px-4 py-3 font-bold">銷售單據</th>
                  <th className="px-4 py-3 font-bold">時間</th>
                  <th className="px-4 py-3 font-bold">金額</th>
                </tr>
              </thead>
              <tbody>
                {sales.filter((sale) => !sale.voided).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-[#706c68]">這段時間未有銷售</td>
                  </tr>
                )}
                {sales
                  .filter((sale) => !sale.voided)
                  .map((sale) => (
                    <tr key={sale.id} className="border-t border-[#ded6cb]">
                      <td className="px-4 py-3 font-bold">{sale.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-[#706c68]">{posWhen(sale.createdAt)}</td>
                      <td className="px-4 py-3 font-bold">{formatPrice(saleTotal(sale))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </PosShell>
  );
}
