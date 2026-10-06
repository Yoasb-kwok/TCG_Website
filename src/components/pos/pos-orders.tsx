"use client";

import { useEffect, useState } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { formatDate, formatPrice } from "@/lib/format";
import { SEARCH_BAR_SELECT_CLASS } from "@/lib/search-bar-styles";

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
  createdAt: string;
  items: OrderItem[];
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "待付款" },
  { value: "PAID", label: "已付款" },
  { value: "SHIPPED", label: "已發貨" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export function PosOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  const load = async (status = statusFilter) => {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/orders${params}`);
    const data = (await res.json()) as { orders?: Order[] };
    setOrders(data.orders ?? []);
  };

  useEffect(() => {
    void load(statusFilter);
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  return (
    <PosShell current="orders">
      <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
        <h1 className="text-2xl font-extrabold">交易紀錄</h1>
        <p className="mt-1 text-sm font-bold text-muted-foreground">網店訂單及付款狀態</p>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={`mt-6 ${SEARCH_BAR_SELECT_CLASS}`}
        >
          <option value="">全部狀態</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{order.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold">{formatPrice(order.totalAmount)}</p>
                  <select
                    value={order.status}
                    onChange={(event) => void updateStatus(order.id, event.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.variant.product.name} ({item.variant.condition}) ×{item.quantity} —{" "}
                    {formatPrice(item.unitPrice * item.quantity)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {orders.length === 0 && <p className="py-12 text-center text-muted-foreground">暫無訂單紀錄</p>}
        </div>
      </div>
    </PosShell>
  );
}
