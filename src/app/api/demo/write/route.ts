import { NextResponse } from "next/server";
import { demoWriteBody } from "@/lib/demo-shop";

function blocked() {
  return NextResponse.json(demoWriteBody(), { status: 403 });
}

export async function POST() {
  return blocked();
}

export async function PUT() {
  return blocked();
}

export async function PATCH() {
  return blocked();
}

export async function DELETE() {
  return blocked();
}
