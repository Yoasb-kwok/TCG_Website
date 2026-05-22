import { NextResponse } from "next/server";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ tournaments: DEMO_TOURNAMENTS });
  }

  try {
    const tournaments = await getPrisma().tournament.findMany({
      where: { status: { in: ["OPEN", "FULL", "IN_PROGRESS"] } },
      include: { _count: { select: { registrations: true } } },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json({
      tournaments: tournaments.map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        description: t.description,
        format: t.format,
        maxPlayers: t.maxPlayers,
        entryFee: t.entryFee,
        prizePool: t.prizePool,
        location: t.location,
        startsAt: t.startsAt.toISOString(),
        registrationDeadline: t.registrationDeadline.toISOString(),
        status: t.status,
        registeredCount: t._count.registrations,
      })),
    });
  } catch {
    return NextResponse.json({ tournaments: DEMO_TOURNAMENTS });
  }
}
