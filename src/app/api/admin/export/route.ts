import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/auth-server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { exportAllTables } from "@/lib/csv-export";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "請先設定 DATABASE_URL" },
      { status: 503 },
    );
  }

  try {
    const csvs = await exportAllTables();
    const zip = new JSZip();

    for (const [tableName, csvContent] of Object.entries(csvs)) {
      if (csvContent) {
        zip.file(`${tableName}.csv`, csvContent);
      }
    }

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return new Response(new Blob([buffer], { type: "application/zip" }), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="tcghk-export-${date}.zip"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "匯出失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
