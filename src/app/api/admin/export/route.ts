import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { exportProductCsv, zipCsvFiles } from "@/lib/csv-export";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  try {
    const csv = await exportProductCsv();
    // Pass UTF-8 bytes with a BOM. A JS string inside the zip is still UTF-8,
    // but without the BOM Excel opens Traditional Chinese as the system code page.
    const buffer = await zipCsvFiles({ product: csv });
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return new Response(new Blob([buffer], { type: "application/zip" }), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="product-export-${date}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "匯出失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
