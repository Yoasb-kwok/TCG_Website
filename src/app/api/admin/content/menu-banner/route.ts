import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getMenuBanner } from "@/lib/site-content";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;
  return NextResponse.json({ banner: await getMenuBanner() });
}

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    image?: string;
    href?: string;
    title?: string;
    active?: boolean;
  } | null;

  const image = body?.image?.trim() ?? "";
  const href = body?.href?.trim() || "/products";
  const title = body?.title?.trim() ?? "";
  const active = body?.active !== false;

  const banner = await getPrisma().menuBanner.upsert({
    where: { id: "default" },
    create: { id: "default", imageUrl: image, href, title, active },
    update: { imageUrl: image, href, title, active },
  });

  return NextResponse.json({
    banner: {
      image: banner.imageUrl,
      href: banner.href,
      title: banner.title,
      active: banner.active,
    },
  });
}
