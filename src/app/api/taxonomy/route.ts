import { NextRequest, NextResponse } from "next/server";
import { listTaxonomyGrouped, listTaxonomyOptions } from "@/lib/taxonomy-db";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { TaxonomyKind } from "@/lib/taxonomy-types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kind = searchParams.get("kind") as TaxonomyKind | null;
  const parentValue = searchParams.get("parentValue");
  const grouped = searchParams.get("grouped") === "1";
  const gameTypeSlug = searchParams.get("gameType");

  // ADR-006: Resolve game type slug to ID
  let gameTypeId: string | undefined;
  if (gameTypeSlug && isDatabaseConfigured()) {
    const prisma = getPrisma();
    const game = await prisma.gameType.findUnique({ where: { slug: gameTypeSlug } });
    if (game) gameTypeId = game.id;
  }

  try {
    if (grouped) {
      const data = await listTaxonomyGrouped(false, gameTypeId);
      return NextResponse.json({ grouped: data });
    }
    const options = await listTaxonomyOptions(
      kind ?? undefined,
      parentValue === null ? undefined : parentValue,
      true,
      gameTypeId,
    );
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取標籤失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
