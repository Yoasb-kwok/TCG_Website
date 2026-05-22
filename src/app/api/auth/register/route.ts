import { NextRequest, NextResponse } from "next/server";
import { hashPassword, isValidPassword } from "@/lib/auth-password";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
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

  if (!email || !password) {
    return NextResponse.json({ error: "請填寫電郵及密碼" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "電郵格式不正確" }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "密碼至少需要 6 個字元" }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "此電郵已被註冊" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone,
      role: "USER",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
