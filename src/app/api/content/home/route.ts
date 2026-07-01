import { NextResponse } from "next/server";
import { getHomeContent } from "@/lib/site-content";

export async function GET() {
  const data = await getHomeContent();
  return NextResponse.json(data);
}
