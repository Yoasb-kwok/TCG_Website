import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const state = searchParams.get("state") as "BOOKED" | "ARRIVED" | null;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (state) where.state = state;
  if (search) {
    where.OR = [
      { productName: { contains: search, mode: "insensitive" } },
      { variant: { product: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const prisma = getPrisma();
  const [records, total] = await Promise.all([
    prisma.stockRecord.findMany({
      where,
      include: {
        variant: {
          select: {
            id: true,
            condition: true,
            isFoil: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { bookedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockRecord.count({ where }),
  ]);

  return NextResponse.json({
    records,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
