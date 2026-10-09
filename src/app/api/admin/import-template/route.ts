import { requireAdmin } from "@/lib/auth-server";
import { CSV_CONTENT_TYPE, excelCsvBytes } from "@/lib/csv-encoding";
import { generateTemplateCsv } from "@/lib/csv-import";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const bytes = excelCsvBytes(generateTemplateCsv());

  return new Response(new Blob([bytes], { type: CSV_CONTENT_TYPE }), {
    headers: {
      "Content-Type": CSV_CONTENT_TYPE,
      "Content-Disposition": 'attachment; filename="product-import-template.csv"',
    },
  });
}
