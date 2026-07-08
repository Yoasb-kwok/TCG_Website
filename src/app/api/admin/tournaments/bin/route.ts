import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/**
 * DELETE: permanently delete trashed tournaments.
 * Body: { ids?: string[], all?: boolean }
 * If all is true, delete every trashed tournament. Otherwise delete the given ids.
 * Registrations are cascaded automatically by the schema (onDelete: Cascade).
 */
export async function DELETE(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

  if (body.all) {
    const result = await getPrisma().tournament.deleteMany({
      where: { deletedAt: { not: null } },
    });
    return NextResponse.json({ ok: true, count: result.count });
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "請選擇至少一場賽事" }, { status: 400 });
  }

  const result = await getPrisma().tournament.deleteMany({
    where: { id: { in: ids }, deletedAt: { not: null } },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
