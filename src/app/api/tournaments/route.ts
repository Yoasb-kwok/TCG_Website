import { NextResponse } from "next/server";
import { getPublishedTournaments } from "@/lib/tournament-data";

// Status sync now runs via getPublishedTournaments() — shared with the list
// and detail pages so they stay consistent without a self-fetch.
export const dynamic = "force-dynamic";

export async function GET() {
  const tournaments = await getPublishedTournaments();
  return NextResponse.json({ tournaments });
}
