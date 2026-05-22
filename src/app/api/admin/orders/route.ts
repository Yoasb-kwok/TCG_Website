import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ orders: [], total: 0 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 30;

  const where = status ? { status: status as "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED" } : {};

  const prisma = getPrisma();
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { take: 1 } } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / pageSize) });
}
