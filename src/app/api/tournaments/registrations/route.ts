import { NextResponse } from "next/server";
import { listRegistrationRosters } from "@/lib/tournament-registrations";

export async function GET() {
  const tournaments = await listRegistrationRosters();
  return NextResponse.json({ tournaments });
}
