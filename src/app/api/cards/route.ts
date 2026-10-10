import { NextRequest, NextResponse } from "next/server";
import { listCatalogCards, pageWindow } from "@/lib/catalog-query";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const { page, pageSize } = pageWindow(searchParams.get("page"), searchParams.get("pageSize"));
  const pending = searchParams.get("pending");

  try {
    const data = await listCatalogCards({
      setCode: searchParams.get("set") ?? searchParams.get("setCode"),
      number:
        searchParams.get("number") ??
        searchParams.get("collectorNumber") ??
        searchParams.get("cardNumber"),
      search: searchParams.get("q") ?? searchParams.get("search") ?? searchParams.get("name"),
      pendingOnly: pending === "1" || pending === "true",
      page,
      pageSize,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取卡牌失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
