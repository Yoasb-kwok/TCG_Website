import { NextRequest, NextResponse } from "next/server";
import { listTaxonomyGrouped, listTaxonomyOptions } from "@/lib/taxonomy-db";
import type { TaxonomyKind } from "@/lib/taxonomy-types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kind = searchParams.get("kind") as TaxonomyKind | null;
  const parentValue = searchParams.get("parentValue");
  const grouped = searchParams.get("grouped") === "1";

  try {
    if (grouped) {
      const data = await listTaxonomyGrouped();
      return NextResponse.json({ grouped: data });
    }
    const options = await listTaxonomyOptions(
      kind ?? undefined,
      parentValue === null ? undefined : parentValue,
    );
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取標籤失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
