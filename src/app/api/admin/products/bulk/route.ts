import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as {
    ids?: string[];
    price?: number;
    stock?: number;
  };

  const ids = body.ids?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "請選擇至少一項商品" }, { status: 400 });
  }
  if (body.price == null && body.stock == null) {
    return NextResponse.json({ error: "請填寫售價或庫存" }, { status: 400 });
  }

  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { variants: { orderBy: { price: "asc" }, take: 1 } },
  });

  let updated = 0;
  await prisma.$transaction(
    products.flatMap((p) => {
      const variant = p.variants[0];
      if (!variant) return [];
      updated += 1;
      return prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          ...(body.price != null ? { price: body.price } : {}),
          ...(body.stock != null ? { stock: body.stock } : {}),
        },
      });
    }),
  );

  return NextResponse.json({ updated, requested: ids.length });
}

export async function DELETE(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as { ids?: string[] };
  const ids = body.ids?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "請選擇至少一項商品" }, { status: 400 });
  }

  const prisma = getPrisma();
  let deleted = 0;
  const failed: string[] = [];

  for (const id of ids) {
    try {
      await prisma.product.delete({ where: { id } });
      deleted += 1;
    } catch {
      failed.push(id);
    }
  }

  return NextResponse.json({
    deleted,
    failed: failed.length,
    message:
      failed.length > 0
        ? `${deleted} 項已刪除；${failed.length} 項可能已有訂單紀錄無法刪除`
        : undefined,
  });
}
