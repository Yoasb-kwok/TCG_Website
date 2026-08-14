import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ transactions: [], total: 0, page: 1, totalPages: 0 });
  }

  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const type = request.nextUrl.searchParams.get("type") ?? undefined;
  const buyerType = request.nextUrl.searchParams.get("buyerType") ?? undefined;
  const sort = request.nextUrl.searchParams.get("sort") ?? "date";
  const order = request.nextUrl.searchParams.get("order") ?? "desc";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");

  // Build where clause
  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (type) where.type = type;
  if (buyerType) where.buyerType = buyerType;

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Build orderBy
  const sortField = sort === "amount" ? "amount" : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const prisma = getPrisma();
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}

// ── POST: Manual offline transaction (ADR-003 Decision 8) ──────────────

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    type: string;
    referenceId: string;
    email: string;
    customerName?: string;
    description: string;
    amount: number;
    status?: string;
    remark?: string;
  };

  // Validate required fields
  if (!body.type || !body.referenceId || !body.email || !body.description || body.amount === undefined) {
    return NextResponse.json(
      { error: "缺少必填欄位" },
      { status: 400 },
    );
  }

  // Determine buyer type: check if a User exists with this email
  const prisma = getPrisma();
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    select: { id: true, name: true },
  });

  const buyerType = existingUser ? "USER" : "GUEST";
  const customerName = existingUser?.name ?? body.customerName ?? null;

  const transaction = await prisma.transaction.create({
    data: {
      type: body.type as "ORDER" | "TOURNAMENT",
      referenceId: body.referenceId,
      buyerType,
      email: body.email.toLowerCase(),
      customerName,
      description: body.description,
      amount: body.amount,
      // ADR-003 Decision 8: offline transactions default to NOT_REQUIRED
      status: (body.status ?? "NOT_REQUIRED") as "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "FAILED" | "NOT_REQUIRED",
      remark: body.remark,
    },
  });

  return NextResponse.json({ transaction });
}
