import { NextResponse } from "next/server";
import { demoWriteBody } from "@/lib/demo-shop";

/** Demo tender never writes a sale or changes stock. */
export async function POST() {
  return NextResponse.json(demoWriteBody(), { status: 403 });
}

export async function DELETE() {
  return NextResponse.json(demoWriteBody(), { status: 403 });
}
