import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { syncTournamentStatuses } from "@/lib/tournament-status";

function slugify(title: string): string {
  return `${title}-${Date.now().toString(36)}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Prisma / Postgres connection-level error codes (shared with the register route). */
const DB_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "P1001",
  "P1002",
  "P1017",
]);

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ tournaments: [] });
  }

  // Lazily advance statuses by Hong Kong time before listing for the admin.
  await syncTournamentStatuses(getPrisma());
  const tournaments = await getPrisma().tournament.findMany({
    include: {
      _count: { select: { registrations: true } },
      registrations: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({ tournaments });
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  let body: {
    title?: string;
    description?: string;
    format?: string;
    maxPlayers?: number | string;
    entryFee?: number | string;
    prizePool?: string;
    location?: string;
    startsAt?: string;
    registrationDeadline?: string;
    durationMinutes?: number | string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  // ── Validate fields before touching the database ──────────────────
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "請輸入賽事名稱" }, { status: 400 });
  }

  const maxPlayers = Number(body.maxPlayers ?? 32);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 1) {
    return NextResponse.json(
      { error: "名額必須為大於 0 的整數" },
      { status: 400 },
    );
  }

  const entryFee = Number(body.entryFee ?? 0);
  if (!Number.isFinite(entryFee) || entryFee < 0) {
    return NextResponse.json({ error: "報名費不能為負數" }, { status: 400 });
  }

  const durationMinutes = Number(body.durationMinutes ?? 120);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "比賽時長必須為大於 0 的數字" },
      { status: 400 },
    );
  }

  const startsAt = new Date(body.startsAt ?? "");
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "比賽時間格式不正確" }, { status: 400 });
  }

  const registrationDeadline = new Date(body.registrationDeadline ?? "");
  if (Number.isNaN(registrationDeadline.getTime())) {
    return NextResponse.json(
      { error: "報名截止時間格式不正確" },
      { status: 400 },
    );
  }

  // ── Persist ───────────────────────────────────────────────────────
  try {
    const tournament = await getPrisma().tournament.create({
      data: {
        title,
        slug: slugify(title),
        description: body.description,
        format: body.format ?? "Standard",
        maxPlayers,
        entryFee,
        prizePool: body.prizePool,
        location: body.location ?? "旺角店",
        startsAt,
        registrationDeadline,
        durationMinutes,
        // A new tournament always starts OPEN; the admin adjusts status after.
        status: "OPEN",
      },
    });

    return NextResponse.json({ tournament });
  } catch (error: unknown) {
    console.error("Create tournament error:", error);
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
    return NextResponse.json(
      { error: "建立賽事失敗，請重試" },
      { status: 500 },
    );
  }
}
