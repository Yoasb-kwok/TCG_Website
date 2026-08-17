import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { listAccounts } from "@/lib/accounts";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "oldest" ? "oldest" : "newest";
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  try {
    const accounts = await listAccounts({ q, sort, includeDeleted });
    return NextResponse.json(accounts);
  } catch (e) {
    const message = e instanceof Error ? e.message : "讀取失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
