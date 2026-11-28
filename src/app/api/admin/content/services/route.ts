import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { DEFAULT_HOME_SERVICES, parseHomeServiceEdits, resolveHomeServices } from "@/lib/home-services";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ services: resolveHomeServices([]), fallback: true });
  }

  try {
    const rows = await getPrisma().homeServiceCard.findMany({
      orderBy: { sortIndex: "asc" },
    });
    return NextResponse.json({
      services: resolveHomeServices(rows),
      fallback: rows.length === 0,
    });
  } catch {
    return NextResponse.json({ services: resolveHomeServices([]), fallback: true });
  }
}

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as { services?: unknown };
  const parsed = parseHomeServiceEdits(body.services ?? DEFAULT_HOME_SERVICES);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    for (const [index, service] of parsed.services.entries()) {
      await tx.homeServiceCard.upsert({
        where: { id: service.id },
        create: {
          id: service.id,
          title: service.title,
          body: service.body,
          imageUrl: service.imageUrl,
          href: service.href,
          sortIndex: index,
        },
        update: {
          title: service.title,
          body: service.body,
          imageUrl: service.imageUrl,
          href: service.href,
          sortIndex: index,
        },
      });
    }
  });

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
