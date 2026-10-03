import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** GET: list all trashed tournaments (deletedAt is not null). */
export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ tournaments: [] });
  }

  const tournaments = await getPrisma().tournament.findMany({
    where: { deletedAt: { not: null } },
    include: {
      _count: { select: { registrations: true } },
      registrations: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { deletedAt: "desc" },
  });

  return NextResponse.json({ tournaments });
}

/** POST: soft-delete tournaments by setting deletedAt. Body: { ids: string[] } */
export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "請選擇至少一場賽事" }, { status: 400 });
  }

  await getPrisma().$transaction(
    ids.map((id) =>
      getPrisma().tournament.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    ),
  );

  return NextResponse.json({ ok: true, count: ids.length });
}
