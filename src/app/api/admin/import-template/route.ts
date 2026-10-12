import { requireAdmin } from "@/lib/auth-server";
import { csvFileResponse } from "@/lib/csv-encoding";
import { generateTemplateCsv } from "@/lib/csv-import";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  return csvFileResponse(generateTemplateCsv(), "product-import-template.csv");
}
