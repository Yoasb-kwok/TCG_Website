import { NextRequest, NextResponse } from "next/server";
import { lookupPosScan } from "@/lib/pos-lookup";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ match: null });
  }

  try {
    const match = await lookupPosScan(q);
    return NextResponse.json({ match });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("barcode") || message.includes("column")) {
      return NextResponse.json(
        { error: "條碼欄位未就緒，請先執行 npm run db:migrate" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "搜尋失敗，請再試一次" }, { status: 500 });
  }
}
