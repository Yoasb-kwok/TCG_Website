"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExpenseRow {
  productName: string;
  condition: string;
  isFoil: boolean;
  quantity: number;
  unitCost: number;
  total: number;
  arrivedAt: string;
}

interface MonthlyReport {
  month: string;
  earned: number;
  spent: number;
  net: number;
  revenueByType: { ORDER: number; TOURNAMENT: number };
  expenses: ExpenseRow[];
}

/** HK$ with 2 decimals — financial figures keep their cents */
function fmtMoney(n: number): string {
  return new Intl.NumberFormat("zh-HK", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Current month ("YYYY-MM") in Asia/Hong_Kong (UTC+8, no DST) */
function currentMonthHk(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ReportsManager() {
  const [month, setMonth] = useState(currentMonthHk());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // Derived loading: true until the report for the selected month arrives.
  // On error the banner shows instead of an eternal spinner.
  const loading = !error && (report === null || report.month !== month);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/reports?month=${month}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "讀取失敗" }));
          if (!cancelled) {
            setReport(null);
            setError(err.error ?? "讀取失敗");
          }
        } else {
          const data = (await res.json()) as MonthlyReport;
          if (!cancelled) {
            setReport(data);
            setError(""); // clear a stale error from a previous month
          }
        }
      } catch {
        if (!cancelled) {
          setReport(null);
          setError("無法連接伺服器");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reports/export?month=${month}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "匯出失敗" }));
        setError(err.error ?? "匯出失敗");
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `revenue-report-${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("無法連接伺服器");
    }
    setExporting(false);
  };

  const atCurrentMonth = month >= currentMonthHk();

  return (
    <div className="space-y-6">
      {/* Month picker + export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="上一個月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="month"
            value={month}
            onChange={(e) => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) {
                setMonth(e.target.value);
              }
            }}
            className="w-40"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={atCurrentMonth}
            aria-label="下一個月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1 h-4 w-4" />
          )}
          匯出 CSV
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">載入中…</span>
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">收入</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {fmtMoney(report.earned)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">支出</p>
              <p className="mt-1 text-2xl font-bold text-red-500">
                {fmtMoney(report.spent)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">淨利</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  report.net >= 0 ? "text-foreground" : "text-red-500"
                }`}
              >
                {fmtMoney(report.net)}
              </p>
            </div>
          </div>

          {/* Revenue split */}
          <div className="rounded-lg border border-border bg-card">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold">
              收入來源
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-2">類型</th>
                  <th className="px-4 py-2 text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2">產品訂單</td>
                  <td className="px-4 py-2 text-right">
                    {fmtMoney(report.revenueByType.ORDER)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2">賽事</td>
                  <td className="px-4 py-2 text-right">
                    {fmtMoney(report.revenueByType.TOURNAMENT)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expense table */}
          <div className="rounded-lg border border-border bg-card">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold">
              到貨支出
            </p>
            {report.expenses.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                本月沒有到貨記錄
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2">產品</th>
                    <th className="px-4 py-2">狀態</th>
                    <th className="px-4 py-2">閃卡</th>
                    <th className="px-4 py-2 text-right">數量</th>
                    <th className="px-4 py-2 text-right">單價</th>
                    <th className="px-4 py-2 text-right">總計</th>
                    <th className="px-4 py-2">到貨日期</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.map((e, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2">{e.productName}</td>
                      <td className="px-4 py-2">{e.condition}</td>
                      <td className="px-4 py-2">{e.isFoil ? "是" : "否"}</td>
                      <td className="px-4 py-2 text-right">{e.quantity}</td>
                      <td className="px-4 py-2 text-right">{fmtMoney(e.unitCost)}</td>
                      <td className="px-4 py-2 text-right">{fmtMoney(e.total)}</td>
                      <td className="px-4 py-2">{e.arrivedAt}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
