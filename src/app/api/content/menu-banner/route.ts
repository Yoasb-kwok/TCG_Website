import { NextResponse } from "next/server";
import { getMenuBanner } from "@/lib/site-content";

export async function GET() {
  const banner = await getMenuBanner();
  if (!banner.active || !banner.image) {
    return NextResponse.json({ banner: null });
  }
  return NextResponse.json({ banner });
}
