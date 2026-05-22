import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { deleteTaxonomyOption, updateTaxonomyOption } from "@/lib/taxonomy-db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const { id } = await params;
  const body = (await request.json()) as {
    label?: string;
    value?: string;
    parentValue?: string | null;
    cardSuffix?: string | null;
    active?: boolean;
  };

  try {
    const option = await updateTaxonomyOption(id, body);
    return NextResponse.json({ option });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const { id } = await params;

  try {
    await deleteTaxonomyOption(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "刪除失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
