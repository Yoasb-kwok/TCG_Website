import { NextRequest, NextResponse } from "next/server";
import { decodeRouteSlug } from "@/lib/registration-input";
import { registerForTournament } from "@/lib/tournament-registrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as {
    playerName?: string;
    email?: string;
    phone?: string;
  } | null;

  const result = await registerForTournament(decodeRouteSlug(slug), {
    playerName: body?.playerName ?? "",
    email: body?.email ?? "",
    phone: body?.phone ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ registration: result.registration }, { status: 201 });
}
