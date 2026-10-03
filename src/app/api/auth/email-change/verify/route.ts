import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDatabaseConfigured } from "@/lib/prisma";
import { verifyEmailChangeOtp } from "@/lib/accounts";

/** POST /api/auth/email-change/verify — 驗證 OTP 完成電郵變更（State 3） */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
  } | null;
  const code = body?.code?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "請輸入 6 位數驗證碼" },
      { status: 400 },
    );
  }

  try {
    const user = await verifyEmailChangeOtp(session.user.id, code);
    return NextResponse.json({
      message: "電郵驗證完成",
      email: user?.email ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "驗證失敗";
    // 嘗試次數過多 → 429，其餘（錯誤碼、過期、無進行中變更）→ 400
    const status = message.includes("過多") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
