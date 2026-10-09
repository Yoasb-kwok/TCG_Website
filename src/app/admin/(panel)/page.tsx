"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Receipt, Trophy, AlertTriangle } from "lucide-react";
import { TrendChartCard } from "@/components/charts/trend-charts";
import { TREND_DAY_COUNT } from "@/lib/chart-days";
import { formatPrice } from "@/lib/format";
import type { DailySalePoint } from "@/lib/pos-shared";

interface OrderTrendPoint {
  label: string;
  caption: string;
  orderCount: number;
  amount: number;
}

interface Stats {
  products: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  tournaments: number;
  registrations: number;
  lowStock: number;
  orderTrend?: OrderTrendPoint[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [saleTrend, setSaleTrend] = useState<DailySalePoint[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => undefined);
    fetch("/api/pos?period=14d")
      .then((r) => r.json())
      .then((data: { trend?: DailySalePoint[] }) => setSaleTrend(data.trend ?? []))
      .catch(() => setSaleTrend([]));
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
      href: "/pos/orders",
      icon: Receipt,
    },
    {
      label: "已付款訂單",
      value: stats?.paidOrders ?? "—",
      href: "/pos/orders",
      icon: Receipt,
    },
    {
      label: "總營收",
      value: stats ? formatPrice(stats.revenue) : "—",
      href: "/pos/orders",
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
    <div className="p-8">
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
            <Icon className={`h-5 w-5 ${warn ? "text-amber-400" : "text-muted-foreground"}`} />
            <p className="mt-4 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-semibold">近{TREND_DAY_COUNT}日走勢</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          直棒是單量，線是金額。點選直棒可看該日。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <TrendChartCard
            title="網上訂單"
            description={`近 ${TREND_DAY_COUNT} 日。已取消不計。金額只計已付款、已出貨、已完成。`}
            points={(stats?.orderTrend ?? []).map((point) => ({
              label: point.label,
              caption: point.caption,
              volume: point.orderCount,
              amount: point.amount,
            }))}
            volumeLabel="單量"
            amountLabel="金額"
            emptyLabel={stats ? "這段時間未有訂單" : "載入網上訂單…"}
          />
          <TrendChartCard
            title="店內銷售"
            description={`近 ${TREND_DAY_COUNT} 日單量與營業額。作廢單據不算在內。`}
            points={(saleTrend ?? []).map((point) => ({
              label: point.label,
              caption: point.caption,
              volume: point.saleCount,
              amount: point.revenue,
            }))}
            volumeLabel="單量"
            amountLabel="營業額"
            emptyLabel={saleTrend ? "這段時間未有銷售" : "載入店內銷售…"}
          />
        </div>
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
