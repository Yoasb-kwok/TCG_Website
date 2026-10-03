import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { verifyOtp, isExpired, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { email?: string; code?: string };
  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (!email || !code) {
    return NextResponse.json(
      { error: "請填寫電郵及驗證碼" },
      { status: 400 },
    );
  }

  // ── Rate limit: per-IP ──────────────────────────────────────────
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(ip, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "嘗試次數過多，請稍後再試" },
      { status: 429 },
    );
  }

  const prisma = getPrisma();

  // ── Find verification row ───────────────────────────────────────
  const row = await prisma.emailVerification.findUnique({
    where: { email },
  });

  if (!row) {
    return NextResponse.json(
      { error: "找不到驗證記錄，請重新發送驗證碼" },
      { status: 404 },
    );
  }

  // ── Check expiry ────────────────────────────────────────────────
  if (isExpired(row.expiresAt)) {
    await prisma.emailVerification.delete({ where: { email } });
    return NextResponse.json(
      { error: "驗證碼已過期，請重新發送" },
      { status: 410 },
    );
  }

  // ── Check attempt count ─────────────────────────────────────────
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "驗證碼已失效（嘗試次數過多），請重新發送" },
      { status: 403 },
    );
  }

  // ── Verify code ─────────────────────────────────────────────────
  const isValid = await verifyOtp(code, row.code);
  if (!isValid) {
    await prisma.emailVerification.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    const remaining = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    return NextResponse.json(
      {
        error: "驗證碼不正確",
        attemptsRemaining: Math.max(0, remaining),
      },
      { status: 400 },
    );
  }

  // ── Create user from stored data ────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      phone: row.phone,
      role: "USER",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // ── Delete verification row ─────────────────────────────────────
  await prisma.emailVerification.delete({ where: { email } });

  return NextResponse.json({ user }, { status: 201 });
}
