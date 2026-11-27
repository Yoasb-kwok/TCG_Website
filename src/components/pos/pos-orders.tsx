"use client";

import { Fragment, useEffect, useState } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { downloadCsv, posAction, posChip, posInput, posIsToday, posMetric, posPage, posSub, posTitle, posWhen } from "@/components/pos/pos-ui";
import { shippingMethodLabel } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OrderItem {
  quantity: number;
  unitPrice: number;
  variant: {
    condition: string;
    product: { name: string; images: { url: string }[] };
  };
}

interface Order {
  id: string;
  email: string;
  status: string;
  totalAmount: number;
  shippingMethod?: string;
  stripeSessionId?: string | null;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "待處理" },
  { value: "PAID", label: "已付款" },
  { value: "SHIPPED", label: "已出貨" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function PosOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/orders");
    const data = (await res.json()) as { orders?: Order[] };
    setOrders(data.orders ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const needle = query.trim().toLowerCase();
  const visible = orders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false;
    if (!needle) return true;
    const haystack = `${order.id} ${order.email} ${order.items.map((item) => item.variant.product.name).join(" ")}`.toLowerCase();
    return haystack.includes(needle);
  });
  const today = orders.filter((order) => posIsToday(order.createdAt) && order.status !== "CANCELLED");
  const stats = [
    { label: "今日交易", value: String(today.length), className: "bg-trtcg-lavender" },
    { label: "已付款", value: String(today.filter((order) => order.status === "PAID" || order.status === "COMPLETED" || order.status === "SHIPPED").length), className: "bg-trtcg-lime" },
    { label: "待處理", value: String(today.filter((order) => order.status === "PENDING").length), className: "bg-trtcg-peach" },
    { label: "今日營業額", value: formatPrice(today.reduce((sum, order) => sum + order.totalAmount, 0)), className: "bg-trtcg-surface" },
  ];

  const exportOrders = () => {
    downloadCsv("pos-orders.csv", [
      ["訂單編號", "來源", "顧客", "狀態", "付款", "金額", "建立時間"],
      ...visible.map((order) => [
        order.id,
        "網上",
        order.email,
        statusLabel(order.status),
        order.stripeSessionId ? "Stripe" : "—",
        String(order.totalAmount),
        posWhen(order.createdAt),
      ]),
    ]);
  };

  return (
    <PosShell current="orders">
      <div className={posPage}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={posTitle}>交易紀錄</h1>
            <p className={posSub}>檢視網上及店內訂單，依狀態追蹤與處理。</p>
          </div>
          <button type="button" onClick={exportOrders} className={posAction}>
            匯出交易
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setStatusFilter("")} className={posChip(statusFilter === "")}>
            全部
          </button>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={posChip(statusFilter === option.value)}
            >
              {option.label}
            </button>
          ))}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋訂單編號、會員或電話"
            aria-label="搜尋交易"
            className={cn(posInput, "min-w-[220px] max-w-[360px] flex-1")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={cn(posMetric, "text-trtcg-ink", stat.className)}>
              <p className="text-[28px] font-bold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-[14px] text-trtcg-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-trtcg-surface text-trtcg-ink shadow-[0_10px_14px_rgba(74,44,22,0.1)]">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[var(--pos-field)] text-[13px] text-trtcg-muted">
              <tr>
                <th className="px-4 py-3 font-bold">訂單編號</th>
                <th className="px-4 py-3 font-bold">來源</th>
                <th className="px-4 py-3 font-bold">顧客</th>
                <th className="px-4 py-3 font-bold">狀態</th>
                <th className="px-4 py-3 font-bold">付款</th>
                <th className="px-4 py-3 font-bold">金額</th>
                <th className="px-4 py-3 font-bold">建立時間</th>
                <th className="px-4 py-3 font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const shipping = shippingMethodLabel(order.shippingMethod);
                return (
                  <Fragment key={order.id}>
                    <tr className="border-t border-trtcg-input-border">
                      <td className="px-4 py-3 font-bold">{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">網上</td>
                      <td className="px-4 py-3">{order.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          aria-label={`${order.id} 狀態`}
                          onChange={(event) => void updateStatus(order.id, event.target.value)}
                          className="rounded-full border border-trtcg-input-border bg-trtcg-surface px-2 py-1 text-[13px]"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">{order.stripeSessionId ? "Stripe" : "—"}</td>
                      <td className="px-4 py-3 font-bold">{formatPrice(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-trtcg-muted">{posWhen(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button type="button" className="font-bold text-trtcg-ink" onClick={() => setOpenId((current) => (current === order.id ? null : order.id))}>
                          查看
                        </button>
                      </td>
                    </tr>
                    {openId === order.id && (
                      <tr key={`${order.id}-detail`} className="border-t border-trtcg-input-border bg-[var(--pos-field)]">
                        <td colSpan={8} className="px-4 py-3 text-[13px] text-trtcg-muted">
                          {shipping ? <p className="mb-1">{shipping}</p> : null}
                          <ul>
                            {order.items.map((item, index) => (
                              <li key={index}>
                                {item.variant.product.name} ({item.variant.condition}) ×{item.quantity} — {formatPrice(item.unitPrice * item.quantity)}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {visible.length === 0 && (
          <div className="rounded-[16px] bg-trtcg-lavender px-5 py-4 text-[14px] text-trtcg-ink">
            <p>篩選後沒有結果時，顯示清楚的空狀態及重設篩選按鈕。</p>
            <button
              type="button"
              className="mt-3 font-bold"
              onClick={() => {
                setStatusFilter("");
                setQuery("");
              }}
            >
              重設篩選
            </button>
          </div>
        )}
      </div>
    </PosShell>
  );
}
