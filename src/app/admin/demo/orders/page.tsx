import { DemoWriteButton } from "@/components/demo/demo-write-button";
import { DEMO_ORDERS, DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "示範訂單" };

export default function DemoAdminOrdersPage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">訂單</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        這些訂單只存在示範畫面。{DEMO_WRITE_DISCLAIMER}
      </p>
      <ul className="mt-6 max-w-2xl space-y-3">
        {DEMO_ORDERS.map((order) => (
          <li key={order.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{order.id}</p>
                <p className="text-sm">{order.item}</p>
                <p className="text-xs text-muted-foreground">
                  {order.email} · {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(order.total)}</p>
                <p className="text-xs text-muted-foreground">{order.status}</p>
              </div>
            </div>
            <div className="mt-3">
              <DemoWriteButton label="更新狀態" payload={{ action: "update-order", id: order.id }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
