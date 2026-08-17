import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { allowedTransitions } from "@/lib/tournament-status";
import { sendTournamentCancellation } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    registrationDeadline?: string;
  };

  const existing = await getPrisma().tournament.findUnique({
    where: { id },
    select: { status: true, startsAt: true, deletedAt: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "賽事不存在" }, { status: 404 });
  }

  if (existing.deletedAt) {
    return NextResponse.json(
      { error: "此賽事已在回收站，無法修改" },
      { status: 403 },
    );
  }

  const data: {
    status?:
      "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DRAFT";
    registrationDeadline?: Date;
  } = {};

  if (body.registrationDeadline !== undefined) {
    const d = new Date(body.registrationDeadline);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "截止時間格式不正確" },
        { status: 400 },
      );
    }
    if (d > existing.startsAt) {
      return NextResponse.json(
        { error: "報名截止時間不能晚於比賽開始時間" },
        { status: 400 },
      );
    }
    data.registrationDeadline = d;
  }

  if (body.status !== undefined) {
    const allowed = allowedTransitions(existing.status);
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "無法變更為此狀態" }, { status: 400 });
    }
    data.status = body.status as
      "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DRAFT";
  }

  if (data.status === undefined && data.registrationDeadline === undefined) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const tournament = await getPrisma().tournament.update({
    where: { id },
    data,
    include: { _count: { select: { registrations: true } } },
  });

  // ── Send cancellation email if status changed to CANCELLED ──────
  if (data.status === "CANCELLED") {
    const prisma = getPrisma();
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: id },
      select: { email: true, playerName: true },
    });

    await sendTournamentCancellation({
      registrations,
      tournamentTitle: tournament.title,
      startsAt: new Intl.DateTimeFormat("zh-HK", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(tournament.startsAt)),
      location: tournament.location,
    });
  }

  return NextResponse.json({ tournament });
}
