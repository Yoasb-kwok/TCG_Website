import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from "@/lib/otp";
import { checkCooldown, checkRateLimit } from "@/lib/rate-limit";

const COOLDOWN_MS = 60_000;
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

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "請填寫電郵" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "電郵格式不正確" }, { status: 400 });
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
  const cooldown = checkCooldown(`reset:${email}`, {
    cooldownMs: COOLDOWN_MS,
  });
  if (!cooldown.allowed) {
    const secs = Math.ceil(cooldown.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `請稍候 ${secs} 秒再試` },
      { status: 429 },
    );
  }

  const prisma = getPrisma();

  // ── Check if user exists ────────────────────────────────────────
  // Do NOT reveal whether the email is registered (anti-enumeration).
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    // Silent no-op — same success response, no email sent
    return NextResponse.json({
      message: "如果此電郵已註冊，驗證碼已發送至您的電郵",
    });
  }

  // ── Generate OTP and store ──────────────────────────────────────
  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.passwordReset.upsert({
    where: { email },
    create: { email, code: codeHash, expiresAt },
    update: { code: codeHash, expiresAt, attempts: 0, used: false },
  });

  // ── Send OTP email ──────────────────────────────────────────────
  await sendOtpEmail({ to: email, code, purpose: "password-reset" });

  return NextResponse.json({
    message: "如果此電郵已註冊，驗證碼已發送至您的電郵",
  });
}
