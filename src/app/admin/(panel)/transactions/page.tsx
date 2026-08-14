"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Printer, Search } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import {
  ORDER_STATUSES,
  TOURNAMENT_STATUSES,
  getStatusOptions,
  getDisplayName,
  type TransactionRow,
} from "@/lib/transaction-types";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPED: "已發貨",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  FAILED: "付款失敗",
  NOT_REQUIRED: "無需付款",
};

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [buyerTypeFilter, setBuyerTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Edit state
  const [editingRemark, setEditingRemark] = useState<string | null>(null);
  const [remarkValue, setRemarkValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (buyerTypeFilter) params.set("buyerType", buyerTypeFilter);
    if (sortBy) params.set("sort", sortBy);
    if (sortOrder) params.set("order", sortOrder);

    const res = await fetch(`/api/admin/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }, [search, statusFilter, typeFilter, buyerTypeFilter, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const saveRemark = async (id: string) => {
    await fetch(`/api/admin/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remark: remarkValue }),
    });
    setEditingRemark(null);
    load();
  };

  const sendReceipt = async (id: string) => {
    const res = await fetch(
      `/api/admin/transactions/${id}/send-receipt`,
      { method: "POST" },
    );
    const data = await res.json();
    if (data.success) {
      alert("收據已發送");
    } else {
      alert("收據發送失敗（SMTP 可能未設定）");
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">交易管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        所有產品訂單及賽事報名的統一交易紀錄
      </p>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋電郵、名稱、描述…"
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
          <option value="">全部類型</option>
          <option value="ORDER">產品訂單</option>
          <option value="TOURNAMENT">賽事報名</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">全部狀態</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={buyerTypeFilter}
          onChange={(e) => setBuyerTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">全部買家</option>
          <option value="USER">已註冊用戶</option>
          <option value="GUEST">訪客</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className="hover:text-foreground"
                >
                  日期 {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="px-3 py-2">買家</th>
              <th className="px-3 py-2">類型</th>
              <th className="px-3 py-2">描述</th>
              <th className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("amount")}
                  className="hover:text-foreground"
                >
                  金額 {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">備註</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  暫無交易紀錄
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-border/50">
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatDate(txn.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{getDisplayName(txn)}</div>
                    <div className="text-xs text-muted-foreground">
                      {txn.buyerType === "USER" ? "用戶" : "訪客"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        txn.type === "ORDER"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-purple-500/10 text-purple-600"
                      }`}
                    >
                      {txn.type === "ORDER" ? "訂單" : "賽事"}
                    </span>
                  </td>
                  <td className="px-3 py-3 max-w-[200px] truncate" title={txn.description}>
                    {txn.description}
                  </td>
                  <td className="px-3 py-3 text-right font-medium">
                    {formatPrice(txn.amount)}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={txn.status}
                      onChange={(e) => updateStatus(txn.id, e.target.value)}
                      className="rounded border border-border bg-background px-1.5 py-1 text-xs"
                    >
                      {getStatusOptions(txn.type).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s] ?? s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 max-w-[150px]">
                    {editingRemark === txn.id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={remarkValue}
                          onChange={(e) => setRemarkValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRemark(txn.id);
                            if (e.key === "Escape") setEditingRemark(null);
                          }}
                          className="w-full rounded border border-border bg-background px-1 py-0.5 text-xs"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveRemark(txn.id)}
                          className="rounded bg-foreground px-2 py-0.5 text-xs text-background"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRemark(txn.id);
                          setRemarkValue(txn.remark ?? "");
                        }}
                        className="text-left text-xs text-muted-foreground hover:text-foreground"
                      >
                        {txn.remark || "—"}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {txn.receiptData && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/admin/transactions/${txn.id}/receipt`,
                              )
                            }
                            title="查看收據"
                            className="rounded p-1 hover:bg-muted"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendReceipt(txn.id)}
                            title="重發收據"
                            className="rounded p-1 hover:bg-muted"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
