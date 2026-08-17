import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { hashPassword, isValidPassword } from "@/lib/auth-password";

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    token?: string;
    password?: string;
  };

  const token = body.token;
  const password = body.password;

  if (!token || !password) {
    return NextResponse.json(
      { error: "缺少必要欄位" },
      { status: 400 },
    );
  }

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "密碼至少需要 6 個字元" },
      { status: 400 },
    );
  }

  // ── Verify JWT ──────────────────────────────────────────────────
  let email: string;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.purpose !== "password_reset" || !payload.email) {
      return NextResponse.json(
        { error: "無效的權杖" },
        { status: 401 },
      );
    }
    email = payload.email as string;
  } catch {
    return NextResponse.json(
      { error: "權杖已過期或無效，請重新申請" },
      { status: 401 },
    );
  }

  const prisma = getPrisma();

  // ── Check that the reset row hasn't been used ───────────────────
  const resetRow = await prisma.passwordReset.findUnique({
    where: { email },
  });
  if (!resetRow || resetRow.used) {
    return NextResponse.json(
      { error: "此重設連結已使用或無效" },
      { status: 401 },
    );
  }

  // ── Update password ─────────────────────────────────────────────
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  // ── Mark reset row as used ──────────────────────────────────────
  await prisma.passwordReset.update({
    where: { email },
    data: { used: true },
  });

  return NextResponse.json({ message: "密碼已重設，請使用新密碼登入" });
}
