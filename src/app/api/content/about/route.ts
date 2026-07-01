import { NextResponse } from "next/server";
import { getAboutContent } from "@/lib/site-content";

export async function GET() {
  const data = await getAboutContent();
  return NextResponse.json(data);
}
