import { NextRequest, NextResponse } from "next/server";
import { listCatalogSets } from "@/lib/catalog-query";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  try {
    const sets = await listCatalogSets(request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("search"));
    return NextResponse.json({ sets, total: sets.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取系列失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
