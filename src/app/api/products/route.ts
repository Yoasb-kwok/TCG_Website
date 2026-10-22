import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { productFiltersFromSearchParams } from "@/lib/storefront-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const data = await getProducts(productFiltersFromSearchParams(request.nextUrl.searchParams));
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
