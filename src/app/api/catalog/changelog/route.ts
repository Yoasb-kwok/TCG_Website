import { NextRequest, NextResponse } from "next/server";
import { listCatalogChangelog } from "@/lib/catalog-query";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const requested = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 20;

  try {
    const entries = await listCatalogChangelog({
      setCode: searchParams.get("set") ?? searchParams.get("setCode"),
      limit,
    });
    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取更新紀錄失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
