import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { importProductsFromCsv } from "@/lib/csv-import";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "請選擇 CSV 檔案" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "檔案不得超過 5MB" },
      { status: 400 },
    );
  }

  const csvText = await file.text();

  try {
    const result = await importProductsFromCsv(csvText);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "匯入失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
