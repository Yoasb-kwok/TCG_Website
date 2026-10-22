import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import { parseMemberRegistration } from "@/lib/member-register";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  }

  const parsed = parseMemberRegistration(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { email, password, name, phone, pokemonId } = parsed.value;
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
      pokemonId,
      role: "USER",
    },
    select: { id: true, email: true, name: true, phone: true, pokemonId: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
