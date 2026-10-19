import { NextResponse } from "next/server";
import { demoWriteBody } from "@/lib/demo-shop";

/** Demo checkout never creates a Stripe session or a database order. */
export async function POST() {
  return NextResponse.json(demoWriteBody(), { status: 403 });
}
