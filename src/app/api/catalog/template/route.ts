import { templateCatalogCsv } from "@/lib/catalog-csv";
import { CSV_CONTENT_TYPE, excelCsvBytes } from "@/lib/csv-encoding";

export async function GET() {
  const bytes = excelCsvBytes(templateCatalogCsv());
  return new Response(new Blob([bytes], { type: CSV_CONTENT_TYPE }), {
    headers: {
      "Content-Type": CSV_CONTENT_TYPE,
      "Content-Disposition": 'attachment; filename="catalog-template.csv"',
    },
  });
}
