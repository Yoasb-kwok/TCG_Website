import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** Prisma / Postgres connection-level error codes */
const DB_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "P1001",
  "P1002",
  "P1017",
]);

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "報名系統暫時無法使用" },
      { status: 503 },
    );
  }

  let body: {
    tournamentId?: string;
    playerName?: string;
    email?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { tournamentId, playerName, email, phone } = body;

  // Validate required fields
  if (!tournamentId) {
    return NextResponse.json({ error: "缺少賽事編號" }, { status: 400 });
  }
  if (!playerName || !playerName.trim()) {
    return NextResponse.json({ error: "請輸入姓名" }, { status: 400 });
  }
  if (!email || !email.trim()) {
    return NextResponse.json({ error: "請輸入電郵" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: "電郵格式不正確" }, { status: 400 });
  }

  const prisma = getPrisma();

  try {
    // Check tournament exists and is open
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { registrations: true } } },
    });

    if (!tournament) {
      return NextResponse.json({ error: "賽事不存在" }, { status: 404 });
    }

    if (tournament.status !== "OPEN") {
      return NextResponse.json(
        { error: "此賽事已不再接受報名" },
        { status: 400 },
      );
    }

    if (tournament._count.registrations >= tournament.maxPlayers) {
      return NextResponse.json({ error: "名額已滿" }, { status: 400 });
    }

    // Check duplicate email for this tournament
    const existing = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_email: {
          tournamentId,
          email: email.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "此電郵已報名此賽事" },
        { status: 409 },
      );
    }

    // Create registration
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        playerName: playerName.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error: unknown) {
    console.error("Registration error:", error);

    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as Record<string, unknown>).code)
        : "";

    if (DB_CONNECTION_ERRORS.has(code)) {
      return NextResponse.json(
        { error: "數據庫連接失敗，請稍後再試" },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "報名失敗，請重試" }, { status: 500 });
  }
}
