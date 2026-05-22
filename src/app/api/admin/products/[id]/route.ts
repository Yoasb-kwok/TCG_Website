import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  updateManualAccessory,
  updateManualSealed,
  updateManualSingle,
} from "@/lib/admin-products";
import {
  isAccessoryProductType,
  isCardPackProductType,
  isSingleProductType,
} from "@/lib/product-type-display";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { id } = await params;
  const product = await getPrisma().product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { price: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "找不到商品" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    variantId?: string;
    price?: number;
    stock?: number;
    name?: string;
    setCode?: string;
    cardNumber?: string;
    rarityTier?: string;
    cardCategory?: string;
    pokemonType?: string;
    description?: string;
    isFoil?: boolean;
    imageUrl?: string;
    type?: string;
  };

  const prisma = getPrisma();
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: { take: 1 }, images: { take: 1 } },
  });

  if (!existing) {
    return NextResponse.json({ error: "找不到商品" }, { status: 404 });
  }

  const variantId = body.variantId ?? existing.variants[0]?.id;
  if (!variantId) {
    return NextResponse.json({ error: "商品缺少規格資料" }, { status: 400 });
  }

  try {
    if (isSingleProductType(existing.type)) {
      if (!body.name?.trim() || !body.setCode || !body.rarityTier || !body.cardCategory) {
        return NextResponse.json(
          { error: "請填寫卡牌名稱、系列、稀有度與類型" },
          { status: 400 },
        );
      }
      if (body.price == null || body.stock == null) {
        return NextResponse.json({ error: "請填寫售價與庫存" }, { status: 400 });
      }
      const product = await updateManualSingle(id, variantId, {
        name: body.name.trim(),
        setCode: body.setCode,
        cardNumber: body.cardNumber,
        rarityTier: body.rarityTier,
        cardCategory: body.cardCategory,
        pokemonType: body.pokemonType,
        price: body.price,
        stock: body.stock,
        description: body.description,
        imageUrl: body.imageUrl,
        isFoil: body.isFoil,
      });
      return NextResponse.json({ product });
    }

    if (isCardPackProductType(existing.type)) {
      if (!body.name?.trim() || body.price == null || body.stock == null) {
        return NextResponse.json(
          { error: "請填寫商品名稱、售價與庫存" },
          { status: 400 },
        );
      }
      const product = await updateManualSealed(id, variantId, {
        name: body.name.trim(),
        type: body.type ?? existing.type,
        setCode: body.setCode,
        price: body.price,
        stock: body.stock,
        description: body.description,
        imageUrl: body.imageUrl,
      });
      return NextResponse.json({ product });
    }

    if (isAccessoryProductType(existing.type)) {
      if (!body.name?.trim() || body.price == null || body.stock == null) {
        return NextResponse.json(
          { error: "請填寫商品名稱、售價與庫存" },
          { status: 400 },
        );
      }
      const product = await updateManualAccessory(id, variantId, {
        name: body.name.trim(),
        description: body.description,
        price: body.price,
        stock: body.stock,
        imageUrl: body.imageUrl,
      });
      return NextResponse.json({ product });
    }

    if (body.name) {
      await prisma.product.update({ where: { id }, data: { name: body.name } });
    }
    if (body.variantId && (body.price != null || body.stock != null)) {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: {
          ...(body.price != null ? { price: body.price } : {}),
          ...(body.stock != null ? { stock: body.stock } : {}),
        },
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, images: true },
    });
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { id } = await params;
  await getPrisma().product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
