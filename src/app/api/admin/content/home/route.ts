import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getDefaultHomeBanners } from "@/lib/site-content";

interface HomeBannerInput {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  gradient: string;
  active: boolean;
}

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const defaultBanners = getDefaultHomeBanners();

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      banners: defaultBanners,
      featuredProductIds: [],
      featuredProducts: [],
      featuredAuto: true,
      featuredPreview: DEMO_PRODUCTS.slice(0, 4),
      fallback: true,
    });
  }

  const prisma = getPrisma();
  const [banners, featured] = await Promise.all([
    prisma.homeBanner.findMany({ orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }] }),
    prisma.homeFeaturedProduct.findMany({
      orderBy: { sortIndex: "asc" },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            variants: { orderBy: { price: "asc" } },
          },
        },
      },
    }),
  ]);

  const featuredAuto = featured.length === 0;
  let featuredPreview: typeof featured extends { product: infer P }[] ? P[] : never =
    featured.map((row) => row.product);

  if (featuredAuto) {
    const autoProducts = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { price: "asc" } },
      },
    });
    featuredPreview = autoProducts.length
      ? autoProducts
      : (DEMO_PRODUCTS.slice(0, 4) as typeof featuredPreview);
  }

  return NextResponse.json({
    banners: banners.length
      ? banners.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          image: item.imageUrl,
          href: item.href,
          gradient: item.gradient,
          active: item.active,
          sortIndex: item.sortIndex,
        }))
      : defaultBanners,
    featuredProductIds: featured.map((row) => row.productId),
    featuredProducts: featured.map((row) => row.product),
    featuredAuto,
    featuredPreview,
    bannersUsingDefaults: banners.length === 0,
    fallback: banners.length === 0,
  });
}

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as {
    banners?: HomeBannerInput[];
    featuredProductIds?: string[];
  };

  const banners = Array.isArray(body.banners) ? body.banners : [];
  const featuredProductIds = Array.isArray(body.featuredProductIds)
    ? body.featuredProductIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (featuredProductIds.length > 8) {
    return NextResponse.json({ error: "熱門商品最多 8 筆" }, { status: 400 });
  }

  for (const banner of banners) {
    if (!banner.title?.trim() || !banner.image?.trim() || !banner.href?.trim()) {
      return NextResponse.json({ error: "Banner 欄位不完整（標題、圖片、連結為必填）" }, { status: 400 });
    }
  }

  const prisma = getPrisma();
  if (featuredProductIds.length) {
    const existingCount = await prisma.product.count({
      where: { id: { in: featuredProductIds } },
    });
    if (existingCount !== featuredProductIds.length) {
      return NextResponse.json({ error: "熱門商品含不存在的商品 ID" }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.homeBanner.deleteMany();
    await tx.homeFeaturedProduct.deleteMany();

    if (banners.length) {
      await tx.homeBanner.createMany({
        data: banners.map((banner, index) => ({
          title: banner.title.trim(),
          subtitle: banner.subtitle?.trim() ?? "",
          imageUrl: banner.image.trim(),
          href: banner.href.trim(),
          gradient: banner.gradient?.trim() ?? "",
          active: Boolean(banner.active),
          sortIndex: index,
        })),
      });
    }

    if (featuredProductIds.length) {
      await tx.homeFeaturedProduct.createMany({
        data: featuredProductIds.map((productId, index) => ({
          productId,
          sortIndex: index,
        })),
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/about");

  return NextResponse.json({ ok: true });
}
