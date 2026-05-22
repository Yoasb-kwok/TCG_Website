import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

function slugify(title: string): string {
  return `${title}-${Date.now().toString(36)}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ tournaments: [] });
  }

  const tournaments = await getPrisma().tournament.findMany({
    include: {
      _count: { select: { registrations: true } },
      registrations: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({ tournaments });
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = await request.json();

  const tournament = await getPrisma().tournament.create({
    data: {
      title: body.title,
      slug: slugify(body.title),
      description: body.description,
      format: body.format ?? "Standard",
      maxPlayers: body.maxPlayers ?? 32,
      entryFee: body.entryFee ?? 0,
      prizePool: body.prizePool,
      location: body.location ?? "旺角店",
      startsAt: new Date(body.startsAt),
      registrationDeadline: new Date(body.registrationDeadline),
      status: body.status ?? "OPEN",
    },
  });

  return NextResponse.json({ tournament });
}
