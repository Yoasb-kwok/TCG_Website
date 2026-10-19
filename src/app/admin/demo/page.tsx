import Link from "next/link";
import { DemoWriteButton } from "@/components/demo/demo-write-button";
import { DEMO_ORDERS, DEMO_OWNER, DEMO_SHOP, demoShopStats } from "@/lib/demo-shop";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "示範總覽" };

export default function DemoAdminHomePage() {
  const stats = demoShopStats();
  const cards = [
    { label: "商品總數", value: String(stats.products), href: "/admin/demo/products" },
    { label: "示範訂單", value: String(stats.orders), href: "/admin/demo/orders" },
    { label: "示範營收", value: formatPrice(stats.revenue), href: "/admin/demo/orders" },
    { label: "店賽", value: String(stats.tournaments), href: "/admin/demo/tournaments" },
    { label: "低庫存 SKU", value: String(stats.lowStock), href: "/admin/demo/products" },
    { label: "規格", value: String(stats.skus), href: "/pos/demo/receiving" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">總覽</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        以{DEMO_OWNER.title} {DEMO_OWNER.name} 的身份查看{DEMO_SHOP.name}。這是示範身份，沒有登入密碼。
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-card p-5 transition hover:border-foreground/20"
          >
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
          </Link>
        ))}
      </div>
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">最近示範訂單</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {DEMO_ORDERS.map((order) => (
            <li key={order.id} className="flex justify-between gap-3">
              <span>
                {order.id} · {order.item}
              </span>
              <span className="text-muted-foreground">
                {formatPrice(order.total)} · {order.status}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <DemoWriteButton label="匯出訂單" payload={{ action: "export-orders" }} />
        </div>
      </section>
    </div>
  );
}
