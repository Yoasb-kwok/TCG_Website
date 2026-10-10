import { templateCatalogCsv } from "@/lib/catalog-csv";

export async function GET() {
  return new Response(templateCatalogCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="catalog-template.csv"',
    },
  });
}
