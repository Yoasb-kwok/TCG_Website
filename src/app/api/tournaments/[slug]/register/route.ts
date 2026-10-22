import { NextRequest, NextResponse } from "next/server";
import { decodeRouteSlug } from "@/lib/registration-input";
import {
  SIGNUP_COOKIE,
  registerForTournament,
  serializeSignupCookie,
} from "@/lib/tournament-registrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const body = (await request.json().catch(() => null)) as {
    playerName?: string;
    email?: string;
    phone?: string;
  } | null;

  const result = await registerForTournament(slug, {
    playerName: body?.playerName ?? "",
    email: body?.email ?? "",
    phone: body?.phone ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ registration: result.registration }, { status: 201 });
  response.cookies.set({
    name: SIGNUP_COOKIE,
    value: serializeSignupCookie(request.cookies.get(SIGNUP_COOKIE)?.value, slug),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
