import { NextRequest, NextResponse } from "next/server";
import { listAccounts } from "@/lib/admin-accounts";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      users: [],
      total: 0,
      page: 1,
      totalPages: 1,
      databaseConfigured: false,
    });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const result = await listAccounts(getPrisma(), search, page);

  return NextResponse.json({ ...result, databaseConfigured: true });
}
