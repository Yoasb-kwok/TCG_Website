import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  createManualAccessory,
  createManualSealed,
  createManualSingle,
} from "@/lib/admin-products";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ProductSort, ProductType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") as ProductType | null;
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 30;
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "newest";
  const setCodes = searchParams.getAll("setCode").filter(Boolean);
  const rarityTiers = searchParams.getAll("rarityTier").filter(Boolean);

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (setCodes.length) where.setCode = { in: setCodes };
  if (rarityTiers.length) where.rarityTier = { in: rarityTiers };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cardSet: { contains: search, mode: "insensitive" } },
      { setCode: { contains: search, mode: "insensitive" } },
      { rarityTier: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    sort === "setCode"
      ? [{ setSortIndex: "asc" as const }, { createdAt: "desc" as const }]
      : sort === "rarityTier"
        ? [{ raritySortIndex: "asc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const prisma = getPrisma();
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        variants: { orderBy: { price: "asc" } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = await request.json();

  try {
    if (body.kind === "single") {
      if (!body.name || !body.setCode || !body.rarityTier || !body.imageUrl) {
        return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
      }
      const product = await createManualSingle({
        name: body.name,
        setCode: body.setCode,
        cardNumber: body.cardNumber,
        rarityTier: body.rarityTier,
        cardCategory: body.cardCategory ?? "POKEMON",
        pokemonType: body.pokemonType,
        price: Number(body.price),
        stock: Number(body.stock),
        description: body.description,
        imageUrl: body.imageUrl,
        isFoil: body.isFoil,
        gameTypeId: body.gameTypeId,
      });
      return NextResponse.json({ product });
    }

    if (body.kind === "sealed") {
      if (!body.name || !body.imageUrl) {
        return NextResponse.json({ error: "缺少商品名稱或圖片" }, { status: 400 });
      }
      const product = await createManualSealed({
        name: body.name,
        type: body.type ?? "BOOSTER_PACK",
        setCode: body.setCode,
        price: Number(body.price),
        stock: Number(body.stock),
        description: body.description,
        imageUrl: body.imageUrl,
        gameTypeId: body.gameTypeId,
      });
      return NextResponse.json({ product });
    }

    if (body.kind === "accessory") {
      const product = await createManualAccessory({
        name: body.name,
        description: body.description,
        price: Number(body.price),
        stock: Number(body.stock),
        imageUrl: body.imageUrl,
        gameTypeId: body.gameTypeId,
      });
      return NextResponse.json({ product });
    }

    return NextResponse.json(
      { error: "請使用 kind: single | sealed | accessory" },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "建立失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
