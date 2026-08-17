import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { verifyOtp, isExpired, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const JWT_EXPIRY = "5m";

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  return new TextEncoder().encode(secret);
}

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
  const row = await prisma.passwordReset.findUnique({ where: { email } });

  if (!row) {
    return NextResponse.json(
      { error: "找不到驗證記錄，請重新發送驗證碼" },
      { status: 404 },
    );
  }

  if (row.used) {
    return NextResponse.json(
      { error: "此驗證碼已使用" },
      { status: 410 },
    );
  }

  if (isExpired(row.expiresAt)) {
    await prisma.passwordReset.delete({ where: { email } });
    return NextResponse.json(
      { error: "驗證碼已過期，請重新發送" },
      { status: 410 },
    );
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "驗證碼已失效（嘗試次數過多），請重新發送" },
      { status: 403 },
    );
  }

  const isValid = await verifyOtp(code, row.code);
  if (!isValid) {
    await prisma.passwordReset.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "驗證碼不正確" }, { status: 400 });
  }

  // ── Issue short-lived JWT ───────────────────────────────────────
  const token = await new SignJWT({ email, purpose: "password_reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());

  return NextResponse.json({ token, expiresIn: 300 });
}
