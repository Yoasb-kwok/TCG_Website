import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from "@/lib/otp";
import { hasPendingEmailChange } from "@/lib/accounts";

/**
 * ADR-008 Decision 3 — admin-triggered password reset.
 * Blocked (409) while an email change is pending: the reset email would go
 * to the new, unverified address and enable account takeover.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "資料庫未設定" }, { status: 503 });
  }

  const { id } = await params;
  const prisma = getPrisma();

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 });
    }
    if (user.deletedAt) {
      return NextResponse.json(
        { error: "此帳號已刪除，無法發送重設密碼" },
        { status: 409 },
      );
    }

    // ADR-008 Decision 3 — block while email change is pending
    if (await hasPendingEmailChange(user.id)) {
      return NextResponse.json(
        { error: "此帳號有進行中的電郵變更，請先完成或還原變更再重設密碼" },
        { status: 409 },
      );
    }

    const code = generateOtp();
    const codeHash = await hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.passwordReset.upsert({
      where: { email: user.email },
      create: { email: user.email, code: codeHash, expiresAt },
      update: { code: codeHash, expiresAt, attempts: 0, used: false },
    });

    const emailSent = await sendOtpEmail({
      to: user.email,
      code,
      purpose: "password-reset",
      name: user.name ?? undefined,
    });

    if (!emailSent) {
      await prisma.passwordReset
        .delete({ where: { email: user.email } })
        .catch(() => {});
      return NextResponse.json(
        { error: "驗證碼發送失敗，請稍後再試" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: "重設密碼驗證碼已發送" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "發送失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
