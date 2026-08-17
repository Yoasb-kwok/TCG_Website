import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  listAllGameTypes,
  createGameType,
} from "@/lib/game-types";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json([
      { id: "demo", name: "Pokémon", slug: "pokemon", sortOrder: 0, isActive: true },
    ]);
  }

  const gameTypes = await listAllGameTypes();
  return NextResponse.json(gameTypes);
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "請填寫遊戲名稱" }, { status: 400 });
  }

  try {
    const gameType = await createGameType({
      name: body.name,
      slug: body.slug?.trim() || undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    return NextResponse.json(gameType, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "建立失敗";
    // Prisma unique constraint violation
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "此 slug 已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
