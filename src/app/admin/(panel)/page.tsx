"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Receipt, Trophy, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/lib/format";

interface Stats {
  products: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  tournaments: number;
  registrations: number;
  lowStock: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const cards = [
    {
      label: "商品總數",
      value: stats?.products ?? "—",
      href: "/admin/products",
      icon: Package,
    },
    {
      label: "訂單總數",
      value: stats?.orders ?? "—",
      href: "/admin/orders",
      icon: Receipt,
    },
    {
      label: "已付款訂單",
      value: stats?.paidOrders ?? "—",
      href: "/admin/orders",
      icon: Receipt,
    },
    {
      label: "總營收",
      value: stats ? formatPrice(stats.revenue) : "—",
      href: "/admin/orders",
      icon: Receipt,
    },
    {
      label: "店賽報名",
      value: stats?.registrations ?? "—",
      href: "/admin/tournaments",
      icon: Trophy,
    },
    {
      label: "低庫存警示",
      value: stats?.lowStock ?? "—",
      href: "/admin/products",
      icon: AlertTriangle,
      warn: (stats?.lowStock ?? 0) > 0,
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold">總覽</h1>
      <p className="mt-1 text-sm text-muted-foreground">TCGHK 商家後台</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, href, icon: Icon, warn }) => (
          <Link
            key={label}
            href={href}
            className={`rounded-xl border p-5 transition hover:border-border ${
              warn
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-card"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${warn ? "text-amber-400" : "text-muted-foreground"}`}
            />
            <p className="mt-4 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">快速上架單卡</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          搜尋卡牌名稱或輸入 ID（如 sv3-199），系統自動抓取官方圖片，並以 TCGdex
          補充繁體中文名稱。只需填寫售價與庫存即可完成上架。
        </p>
        <Link
          href="/admin/products"
          className="mt-4 inline-block text-sm font-medium text-pink-400 hover:text-pink-300"
        >
          前往商品上架 →
        </Link>
      </div>
    </div>
  );
}
