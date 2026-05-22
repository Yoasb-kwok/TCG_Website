import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "請先登入" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "拒絕存取 (403)" }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}
