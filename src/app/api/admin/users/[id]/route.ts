import { NextRequest, NextResponse } from "next/server";
import { getAccountDetail, parseAccountUpdate, updateAccount } from "@/lib/admin-accounts";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { id } = await params;
  const detail = await getAccountDetail(getPrisma(), id);
  if (!detail) {
    return NextResponse.json({ error: "找不到此帳戶" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  }

  const parsed = parseAccountUpdate(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;
  const user = await updateAccount(getPrisma(), id, parsed.data);
  if (!user) {
    return NextResponse.json({ error: "找不到此帳戶" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
