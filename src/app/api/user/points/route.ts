import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPointsBalance } from "@/lib/points";
import { isDatabaseConfigured } from "@/lib/prisma";

/** GET /api/user/points — current user's loyalty points balance */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ points: 0 });
  }

  const balance = await getPointsBalance(session.user.email);
  return NextResponse.json({ points: balance });
}
