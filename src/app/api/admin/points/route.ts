import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getPointsBalance, adminSetPoints } from "@/lib/points";

/** GET /api/admin/points — aggregated list for admin dashboard */
export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ accounts: [] });
  }

  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const typeFilter = request.nextUrl.searchParams.get("type") ?? ""; // USER | GUEST | ""

  const prisma = getPrisma();
  const rows = (await prisma.$queryRaw`
    SELECT
      p.email,
      COALESCE(SUM(p.delta), 0) AS balance,
      u.name,
      CASE WHEN u.id IS NOT NULL THEN 'USER' ELSE 'GUEST' END AS type,
      MAX(p."createdAt") AS "lastEarned"
    FROM "PointLedger" p
    LEFT JOIN "User" u ON u.email = p.email
    WHERE (
      ${search} = ''
      OR u.name ILIKE '%' || ${search} || '%'
      OR p.email ILIKE '%' || ${search} || '%'
    )
    GROUP BY p.email, u.name, u.id
    ORDER BY balance DESC
  `) as {
    email: string;
    balance: bigint | number;
    name: string | null;
    type: "USER" | "GUEST";
    lastEarned: Date | null;
  }[];

  // Filter by type in TypeScript (since type is computed in SQL)
  const filtered = typeFilter
    ? rows.filter((r) => r.type === typeFilter)
    : rows;

  const accounts = filtered.map((r) => ({
    email: r.email,
    name: r.name,
    type: r.type,
    balance: Number(r.balance),
    lastEarned: r.lastEarned,
  }));

  return NextResponse.json({ accounts });
}

/** PATCH /api/admin/points — admin adjusts points (absolute set + reason) */
export async function PATCH(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const { email, target, note } = (await request.json()) as {
    email: string;
    target: number;
    note: string;
  };

  try {
    await adminSetPoints(email, target, note, authCheck.session.user.id);
    const balance = await getPointsBalance(email);
    return NextResponse.json({ email, points: balance });
  } catch (err) {
    const message = err instanceof Error ? err.message : "調整失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
