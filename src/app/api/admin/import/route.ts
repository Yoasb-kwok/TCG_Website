import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { decodeCsvUpload } from "@/lib/csv-encoding";
import { importProductsFromCsv, importProductsFromXlsx } from "@/lib/csv-import";
import { isDatabaseConfigured } from "@/lib/prisma";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "請選擇 CSV 或 Excel 檔案" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "檔案不得超過 5MB" }, { status: 400 });
  }

  const filename = file.name.toLowerCase();
  if (filename.endsWith(".xls") && !filename.endsWith(".xlsx")) {
    return NextResponse.json({ error: "請另存為 .xlsx 或 CSV UTF-8" }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const spreadsheet =
      filename.endsWith(".xlsx") ||
      file.type.includes("spreadsheet") ||
      file.type.includes("excel");
    const result = spreadsheet
      ? await importProductsFromXlsx(bytes)
      : await importProductsFromCsv(decodeCsvUpload(bytes));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "匯入失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
