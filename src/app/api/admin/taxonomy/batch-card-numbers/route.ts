import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { batchGenerateCardNumbers } from "@/lib/taxonomy-db";

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const body = (await request.json()) as {
    setCode?: string;
    suffix?: string;
    min?: number;
    max?: number;
    padWidth?: number;
  };

  try {
    const result = await batchGenerateCardNumbers({
      setCode: body.setCode ?? "",
      suffix: body.suffix ?? "",
      min: Number(body.min),
      max: Number(body.max),
      padWidth: body.padWidth,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "批次產生失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
