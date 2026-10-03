import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { hashPassword, isValidPassword } from "@/lib/auth-password";
import { sendOtpEmail } from "@/lib/email";
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from "@/lib/otp";
import { checkCooldown, checkRateLimit } from "@/lib/rate-limit";

/** 冷卻：同一 email 60 秒內只能請求一次 OTP */
const COOLDOWN_MS = 60_000;
/** 速率限制：同一 IP 10 分鐘內最多 5 次 */
const RATE_LIMIT_MAX = 5;
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

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim() || null;
  const phone = body.phone?.trim() || null;

  // ── Validate input ──────────────────────────────────────────────
  if (!email) {
    return NextResponse.json({ error: "請填寫電郵" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "請填寫密碼" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "電郵格式不正確" }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "密碼至少需要 6 個字元" },
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
      { error: "請求過於頻繁，請稍後再試" },
      { status: 429 },
    );
  }

  // ── Rate limit: per-email cooldown ──────────────────────────────
  const cooldown = checkCooldown(`otp:${email}`, { cooldownMs: COOLDOWN_MS });
  if (!cooldown.allowed) {
    const secs = Math.ceil(cooldown.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `請稍候 ${secs} 秒再試` },
      { status: 429 },
    );
  }

  const prisma = getPrisma();

  // ── Check email not already registered ──────────────────────────
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "此電郵已被註冊" },
      { status: 409 },
    );
  }

  // ── Generate OTP and store ──────────────────────────────────────
  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const passwordHash = await hashPassword(password);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.emailVerification.upsert({
    where: { email },
    create: {
      email,
      code: codeHash,
      passwordHash,
      name,
      phone,
      expiresAt,
    },
    update: {
      code: codeHash,
      passwordHash,
      name,
      phone,
      expiresAt,
      attempts: 0,
    },
  });

  // ── Send OTP email ──────────────────────────────────────────────
  const emailSent = await sendOtpEmail({
    to: email,
    code,
    purpose: "registration",
    name: name ?? undefined,
  });

  if (!emailSent) {
    await prisma.emailVerification.delete({ where: { email } }).catch(() => {});
    return NextResponse.json(
      { error: "驗證碼發送失敗，請稍後再試或聯絡我們" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: "驗證碼已發送至您的電郵，請在 10 分鐘內輸入",
  });
}
