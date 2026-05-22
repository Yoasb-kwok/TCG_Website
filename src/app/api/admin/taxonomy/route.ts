import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  createTaxonomyOption,
  listTaxonomyGrouped,
  listTaxonomyOptions,
} from "@/lib/taxonomy-db";
import type { TaxonomyKind } from "@/lib/taxonomy-types";
import { ALL_TAXONOMY_KINDS } from "@/lib/taxonomy-types";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const kind = request.nextUrl.searchParams.get("kind") as TaxonomyKind | null;
  const parentValue = request.nextUrl.searchParams.get("parentValue");
  const grouped = request.nextUrl.searchParams.get("grouped") === "1";

  try {
    if (grouped) {
      const data = await listTaxonomyGrouped(false);
      return NextResponse.json({ grouped: data, kinds: ALL_TAXONOMY_KINDS });
    }
    const options = await listTaxonomyOptions(
      kind ?? undefined,
      parentValue ?? undefined,
      false,
    );
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const body = (await request.json()) as {
    kind?: TaxonomyKind;
    value?: string;
    label?: string;
    parentValue?: string | null;
    cardSuffix?: string | null;
  };

  if (!body.kind || !body.value?.trim() || !body.label?.trim()) {
    return NextResponse.json({ error: "請填寫類型、代碼與標籤" }, { status: 400 });
  }

  try {
    const option = await createTaxonomyOption({
      kind: body.kind,
      value: body.value,
      label: body.label,
      parentValue: body.parentValue,
      cardSuffix: body.cardSuffix,
    });
    return NextResponse.json({ option });
  } catch (err) {
    const message = err instanceof Error ? err.message : "新增失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
