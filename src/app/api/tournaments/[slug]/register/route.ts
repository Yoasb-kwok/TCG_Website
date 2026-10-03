import { NextRequest, NextResponse } from "next/server";
import { registerForTournament } from "@/lib/tournament-registrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as {
    playerName?: string;
    phone?: string;
  } | null;

  const result = await registerForTournament(
    slug,
    body?.playerName ?? "",
    body?.phone ?? "",
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ registration: result.registration });
}
