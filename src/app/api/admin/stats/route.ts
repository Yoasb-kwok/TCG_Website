import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

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
    });
  }

  try {
    const prisma = getPrisma();

    const [
      products,
      orders,
      paidOrders,
      revenueAgg,
      tournaments,
      registrations,
      lowStock,
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
    ]);

    return NextResponse.json({
      products,
      orders,
      paidOrders,
      revenue: revenueAgg._sum.totalAmount ?? 0,
      tournaments,
      registrations,
      lowStock,
    });
  } catch {
    // Return zeros if any table is missing or query fails
    return NextResponse.json({
      products: 0,
      orders: 0,
      paidOrders: 0,
      revenue: 0,
      tournaments: 0,
      registrations: 0,
      lowStock: 0,
    });
  }
}
