import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { generateTemplateCsv } from "@/lib/csv-import";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const csv = generateTemplateCsv();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="product-import-template.csv"`,
    },
  });
}
