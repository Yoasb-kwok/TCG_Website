"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { formatDate } from "@/lib/format";

interface PointAccount {
  email: string;
  name: string | null;
  type: "USER" | "GUEST";
  balance: number;
  lastEarned: string | null;
}

export default function AdminPointsPage() {
  const [accounts, setAccounts] = useState<PointAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Edit dialog state
  const [editing, setEditing] = useState<PointAccount | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);

    const res = await fetch(`/api/admin/points?${params}`);
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [load]);

  const openEdit = (acct: PointAccount) => {
    setEditing(acct);
    setTargetValue(String(acct.balance));
    setReason("");
  };

  const closeEdit = () => {
    setEditing(null);
    setTargetValue("");
    setReason("");
  };

  const saveEdit = async () => {
    if (!editing || !reason.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/points", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: editing.email,
        target: Number(targetValue),
        note: reason,
      }),
    });

    if (res.ok) {
      closeEdit();
      load();
    }
    setSaving(false);
  };

  const currentBalance = editing?.balance ?? 0;
  const targetNum = Number(targetValue) || 0;
  const delta = targetNum - currentBalance;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">積分管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        查看及調整客戶積分（每 HKD 1 消費 = 1 積分）
      </p>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋電郵、名稱…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">全部買家</option>
          <option value="USER">已註冊用戶</option>
          <option value="GUEST">訪客</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2">排名</th>
              <th className="px-3 py-2">電郵</th>
              <th className="px-3 py-2">名稱</th>
              <th className="px-3 py-2">類型</th>
              <th className="px-3 py-2 text-right">積分</th>
              <th className="px-3 py-2">最後獲得</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  暫無積分紀錄
                </td>
              </tr>
            ) : (
              accounts.map((acct, i) => (
                <tr key={acct.email} className="border-b border-border/50">
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3">{acct.email}</td>
                  <td className="px-3 py-3">{acct.name || "—"}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${
                        acct.type === "USER"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {acct.type === "USER" ? "用戶" : "訪客"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-amber-600">
                    {acct.balance}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {acct.lastEarned ? formatDate(acct.lastEarned) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(acct)}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      調整
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="調整積分"
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">調整積分</h2>
              <button type="button" onClick={closeEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">電郵</p>
                <p className="font-medium">{editing.email}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">目前積分</p>
                <p className="text-2xl font-bold text-amber-600">{currentBalance}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">目標積分</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  min={0}
                />
              </div>

              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                變更：{delta >= 0 ? "+" : ""}{delta} 積分
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="必須填寫調整原因…"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!reason.trim() || saving}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
                >
                  {saving ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
