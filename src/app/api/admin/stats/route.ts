import { NextResponse } from "next/server";
import { dayCaption, dayKey, eachLocalDay, seriesDayLabel, trendWindow } from "@/lib/chart-days";
import { requireAdmin } from "@/lib/auth-server";
import { roundMoney } from "@/lib/pos-shared";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

const REVENUE_STATUSES = new Set(["PAID", "SHIPPED", "COMPLETED"]);

function orderTrend(
  orders: { createdAt: Date; status: string; totalAmount: number }[],
  now = new Date(),
) {
  const { from, to } = trendWindow(now);
  const days = eachLocalDay(from, to);
  const allowed = new Set(days.map((day) => dayKey(day)));
  const totals = new Map<string, { orderCount: number; amount: number }>();

  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    const key = dayKey(order.createdAt);
    if (!allowed.has(key)) continue;
    const row = totals.get(key) ?? { orderCount: 0, amount: 0 };
    row.orderCount += 1;
    if (REVENUE_STATUSES.has(order.status)) {
      row.amount = roundMoney(row.amount + order.totalAmount);
    }
    totals.set(key, row);
  }

  return days.map((day, index) => {
    const row = totals.get(dayKey(day));
    return {
      date: dayKey(day),
      label: seriesDayLabel(day, index, days),
      caption: dayCaption(day),
      orderCount: row?.orderCount ?? 0,
      amount: row?.amount ?? 0,
    };
  });
}

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      products: 0,
      orders: 0,
      paidOrders: 0,
      revenue: 0,
      tournaments: 0,
      registrations: 0,
      lowStock: 0,
      orderTrend: orderTrend([]),
    });
  }

  const prisma = getPrisma();
  const now = new Date();
  const { from } = trendWindow(now);

  const [
    products,
    orders,
    paidOrders,
    revenueAgg,
    tournaments,
    registrations,
    lowStock,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
      _sum: { totalAmount: true },
    }),
    prisma.tournament.count(),
    prisma.tournamentRegistration.count(),
    prisma.productVariant.count({ where: { stock: { lte: 2, gt: 0 } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true, status: true, totalAmount: true },
    }),
  ]);

  return NextResponse.json({
    products,
    orders,
    paidOrders,
    revenue: revenueAgg._sum.totalAmount ?? 0,
    tournaments,
    registrations,
    lowStock,
    orderTrend: orderTrend(recentOrders, now),
  });
}
