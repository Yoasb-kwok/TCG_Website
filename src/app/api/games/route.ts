import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { listActiveGameTypes } from "@/lib/game-types";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json([
      { id: "demo", name: "Pokémon", slug: "pokemon", sortOrder: 0, isActive: true },
    ]);
  }

  const gameTypes = await listActiveGameTypes();
  return NextResponse.json(gameTypes);
}
