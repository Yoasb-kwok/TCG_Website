import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { parseRecycleListings } from "@/lib/recycle-listings";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ listings: [], fallback: true });
  }

  try {
  const rows = await getPrisma().recycleListing.findMany({
    orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  });

  return NextResponse.json({
    listings: rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      price: row.price,
      active: row.active,
      name: row.product.name,
      type: row.product.type,
      imageUrl: row.product.images[0]?.url ?? null,
    })),
  });
  } catch {
    return NextResponse.json({ listings: [], fallback: true });
  }
}

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as { listings?: unknown };
  const parsed = parseRecycleListings(body.listings);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const products = parsed.listings.length
      ? await prisma.product.findMany({
          where: { id: { in: parsed.listings.map((item) => item.productId) } },
          select: { id: true, type: true },
        })
      : [];
    if (products.length !== parsed.listings.length) {
      return NextResponse.json({ error: "回收清單含不存在的商品" }, { status: 400 });
    }
    if (products.some((product) => product.type !== "SINGLE")) {
      return NextResponse.json({ error: "只可把單卡加入回收" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.recycleListing.deleteMany();
      if (parsed.listings.length) {
        await tx.recycleListing.createMany({
          data: parsed.listings.map((item, index) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            active: item.active,
            sortIndex: index,
          })),
        });
      }
    });
  } catch {
    return NextResponse.json({ error: "無法儲存回收清單，請先套用最新資料庫遷移" }, { status: 503 });
  }

  revalidatePath("/recycle");
  return NextResponse.json({ ok: true });
}
