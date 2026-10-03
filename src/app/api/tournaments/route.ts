import { NextResponse } from "next/server";
import { listPublicTournaments } from "@/lib/tournament-registrations";

export async function GET() {
  const tournaments = await listPublicTournaments();
  return NextResponse.json({ tournaments });
}
