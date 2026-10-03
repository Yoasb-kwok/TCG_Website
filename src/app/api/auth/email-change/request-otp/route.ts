import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDatabaseConfigured } from "@/lib/prisma";
import { issueEmailChangeOtp } from "@/lib/accounts";
import { sendOtpEmail } from "@/lib/email";
import { checkCooldown, checkRateLimit } from "@/lib/rate-limit";

/** 冷卻：同一用戶 60 秒內只能請求一次 OTP（ADR-008 Decision 4） */
const COOLDOWN_MS = 60_000;
/** 速率限制：同一 IP 10 分鐘內最多 5 次 */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** POST /api/auth/email-change/request-otp — 送出 OTP 至新電郵（State 2 觸發） */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipLimit = checkRateLimit(`email-change-otp-ip:${ip}`, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "請求過於頻繁，請稍後再試" },
      { status: 429 },
    );
  }

  const cooldown = checkCooldown(`email-change-otp:${session.user.id}`, {
    cooldownMs: COOLDOWN_MS,
  });
  if (!cooldown.allowed) {
    const secs = Math.ceil(cooldown.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `請稍候 ${secs} 秒再試` },
      { status: 429 },
    );
  }

  try {
    const { code, newEmail } = await issueEmailChangeOtp(session.user.id);

    const sent = await sendOtpEmail({
      to: newEmail,
      code,
      purpose: "email-change",
      name: session.user.name ?? undefined,
    });
    if (!sent) {
      return NextResponse.json(
        { error: "驗證碼發送失敗，請稍後再試" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: "驗證碼已發送至您的新電郵",
      newEmail,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "發送失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
