import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { readShopBoard, writeShopBoard } from "@/lib/shop-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const snapshot = await readShopBoard();
    return NextResponse.json(snapshot, { headers: NO_STORE });
  } catch (error) {
    console.error("GET /api/tournaments/board failed", error);
    return NextResponse.json({ error: "未能讀取計分板" }, { status: 500, headers: NO_STORE });
  }
}

export async function PUT(request: Request) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const text = await request.text();
  if (text.length > 200_000) {
    return NextResponse.json({ error: "計分板太大" }, { status: 413, headers: NO_STORE });
  }

  let body: unknown = null;
  if (text.trim()) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      return NextResponse.json({ error: "計分板格式不正確" }, { status: 400, headers: NO_STORE });
    }
  }

  try {
    const snapshot = await writeShopBoard(body);
    return NextResponse.json(snapshot, { headers: NO_STORE });
  } catch (error) {
    console.error("PUT /api/tournaments/board failed", error);
    return NextResponse.json({ error: "未能儲存計分板" }, { status: 500, headers: NO_STORE });
  }
}
