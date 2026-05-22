import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { reorderTaxonomyOptions } from "@/lib/taxonomy-db";
import type { TaxonomyKind } from "@/lib/taxonomy-types";

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const body = (await request.json()) as {
    kind?: TaxonomyKind;
    orderedIds?: string[];
    parentValue?: string | null;
  };

  if (!body.kind || !body.orderedIds?.length) {
    return NextResponse.json({ error: "缺少 kind 或 orderedIds" }, { status: 400 });
  }

  try {
    const options = await reorderTaxonomyOptions(
      body.kind,
      body.orderedIds,
      body.parentValue,
    );
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "排序失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
