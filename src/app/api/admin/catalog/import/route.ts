import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { importCatalogCsv, isCatalogImportError } from "@/lib/catalog-import";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

const MAX_CSV_BYTES = 2_000_000;

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let csv = "";
    let setCode = "";
    let note = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { csv?: string; setCode?: string; note?: string };
      csv = body.csv ?? "";
      setCode = body.setCode ?? "";
      note = body.note ?? "";
    } else {
      const form = await request.formData();
      const file = form.get("file");
      const pasted = form.get("csv");
      setCode = String(form.get("setCode") ?? "");
      note = String(form.get("note") ?? "");
      if (file instanceof File) {
        if (file.size > MAX_CSV_BYTES) {
          return NextResponse.json({ error: "CSV 超過 2MB" }, { status: 400 });
        }
        csv = await file.text();
      } else if (typeof pasted === "string") {
        csv = pasted;
      }
    }

    if (!csv.trim()) {
      return NextResponse.json({ error: "請上傳 CSV" }, { status: 400 });
    }
    if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
      return NextResponse.json({ error: "CSV 超過 2MB" }, { status: 400 });
    }

    const result = await importCatalogCsv(getPrisma(), csv, { setCode, note });
    return NextResponse.json(result);
  } catch (err) {
    if (isCatalogImportError(err)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "匯入失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
