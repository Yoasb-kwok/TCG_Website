import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listRegistrationRosters,
  registrationListsForViewer,
} from "@/lib/tournament-registrations";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const [rosters, session] = await Promise.all([listRegistrationRosters(), auth()]);
  const tournaments = registrationListsForViewer(rosters, {
    isAdmin: session?.user?.role === "ADMIN",
  });
  return NextResponse.json({ tournaments }, { headers: NO_STORE });
}
