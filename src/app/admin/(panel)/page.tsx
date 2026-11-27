"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminMetric } from "@/components/admin/admin-page-header";
import { TrendChartCard } from "@/components/charts/trend-charts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const dash = stats ? String(stats.products) : "—";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[40px] font-bold leading-[1.3] text-trtcg-ink">總覽</h1>
        <p className="mt-3 text-[16px] leading-[1.65] text-trtcg-muted">TCGHK 商家後台</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <AdminMetric label="商品總數" value={dash} tone="lavender" href="/admin/products" />
        <AdminMetric
          label="訂單總數"
          value={stats ? String(stats.orders) : "—"}
          href="/pos/orders"
        />
        <AdminMetric
          label="已付款訂單"
          value={stats ? String(stats.paidOrders) : "—"}
          href="/pos/orders"
        />
        <AdminMetric
          label="總營收"
          value={stats ? formatPrice(stats.revenue) : "—"}
          tone="peach"
          href="/pos/orders"
        />
        <AdminMetric
          label="店賽報名"
          value={stats ? String(stats.registrations) : "—"}
          href="/admin/tournaments"
        />
        <AdminMetric
          label="低庫存警示"
          value={stats ? String(stats.lowStock) : "—"}
          tone="lime"
          href="/pos/receiving"
        />
      </div>

      <div>
        <h2 className="text-[28px] font-bold leading-[1.4] text-trtcg-ink">近 {TREND_DAY_COUNT} 日走勢</h2>
        <p className="mt-3 text-[16px] leading-[1.65] text-trtcg-muted">
          直棒是單量，線是金額。點選直棒可看該日。
        </p>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
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

      <section className="rounded-3xl bg-trtcg-lavender p-8">
        <h2 className="text-[28px] font-bold leading-[1.4] text-trtcg-ink">快速上架單卡</h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-[1.65] text-trtcg-ink">
          搜尋卡牌名稱或輸入 ID（如 sv3-199），系統自動抓取官方圖片，並以 TCGdex
          補充繁體中文名稱。只需填寫售價與庫存即可完成上架。
        </p>
        <Link href="/admin/products" className={cn(buttonVariants({ variant: "primary" }), "mt-5 w-fit")}>
          前往商品上架 →
        </Link>
      </section>
    </div>
  );
}
