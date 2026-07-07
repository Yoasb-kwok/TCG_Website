import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** Same slug logic as the single-create route. */
function slugify(title: string): string {
  return `${title}-${Date.now().toString(36)}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Prisma / Postgres connection-level error codes (shared with single route). */
const DB_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "P1001",
  "P1002",
  "P1017",
]);

/** ms per day — used to shift the registration deadline backwards from startsAt. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    location?: string;
    prizePool?: string;
    durationMinutes?: number | string;
    startTime?: string;
    daysBeforeDeadline?: number | string;
    dates?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  // ── Validate shared fields ─────────────────────────────────────────
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

  // startTime: HH:MM 24-hour
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return NextResponse.json(
      { error: "比賽時間格式不正確（HH:MM）" },
      { status: 400 },
    );
  }

  // daysBeforeDeadline: non-negative integer
  const daysBeforeDeadline = Number(body.daysBeforeDeadline ?? 0);
  if (
    !Number.isFinite(daysBeforeDeadline) ||
    !Number.isInteger(daysBeforeDeadline) ||
    daysBeforeDeadline < 0
  ) {
    return NextResponse.json(
      { error: "截止天數必須為 0 或正整數" },
      { status: 400 },
    );
  }

  // dates: array of YYYY-MM-DD strings, at least one
  const dates = Array.isArray(body.dates) ? body.dates : [];
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "請至少選擇一個比賽日期" },
      { status: 400 },
    );
  }
  for (const d of dates) {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return NextResponse.json(
        { error: `日期格式不正確：${d}` },
        { status: 400 },
      );
    }
  }

  // ── Build tournament rows ──────────────────────────────────────────
  // Sort dates chronologically so auto-numbering follows calendar order.
  const sorted = [...dates].sort();

  const rows = sorted.map((date, i) => {
    const startsAt = new Date(`${date}T${startTime}`);
    const registrationDeadline = new Date(
      startsAt.getTime() - daysBeforeDeadline * MS_PER_DAY,
    );

    // Auto-number: every tournament gets a "#N" suffix so titles are distinct.
    const numberedTitle = `${title} #${i + 1}`;

    return {
      title: numberedTitle,
      slug: slugify(numberedTitle),
      description: body.description,
      format: body.format ?? "Standard",
      maxPlayers,
      entryFee,
      prizePool: body.prizePool,
      location: body.location ?? "旺角店",
      startsAt,
      registrationDeadline,
      durationMinutes,
      status: "OPEN" as const,
    };
  });

  // ── Persist atomically (all-or-nothing) ────────────────────────────
  try {
    const created = await getPrisma().$transaction(
      rows.map((data) => getPrisma().tournament.create({ data })),
    );

    return NextResponse.json(
      { created: created.length, tournaments: created },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Batch create tournament error:", error);
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
      { error: "批次建立賽事失敗，請重試" },
      { status: 500 },
    );
  }
}
