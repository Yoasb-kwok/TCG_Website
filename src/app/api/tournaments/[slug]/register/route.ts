import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { decodeRouteSlug } from "@/lib/registration-input";
import {
  SIGNUP_COOKIE,
  cancelTournamentRegistration,
  registerForTournament,
  removeSignupCookie,
  serializeSignupCookie,
  type CancelOwner,
} from "@/lib/tournament-registrations";

function signupCookie(value: string) {
  return {
    name: SIGNUP_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  };
}

async function signedInOwner(): Promise<CancelOwner | null> {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  const email = session?.user?.email?.trim();
  if (!userId || !email) return null;
  return { userId, email };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const [owner, body] = await Promise.all([
    signedInOwner(),
    request.json().catch(() => null) as Promise<{
      playerName?: string;
      email?: string;
      phone?: string;
    } | null>,
  ]);

  const result = await registerForTournament(
    slug,
    {
      playerName: body?.playerName ?? "",
      email: body?.email ?? "",
      phone: body?.phone ?? "",
    },
    undefined,
    owner,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json(
    {
      registration: {
        id: result.registration.id,
        slug: result.registration.slug,
        playerName: result.registration.playerName,
        email: result.registration.email,
        phone: result.registration.phone,
        createdAt: result.registration.createdAt,
      },
    },
    { status: 201 },
  );
  response.cookies.set(
    signupCookie(serializeSignupCookie(request.cookies.get(SIGNUP_COOKIE)?.value, slug)),
  );
  return response;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const owner = await signedInOwner();
  if (!owner) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const result = await cancelTournamentRegistration(slug, owner);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    signupCookie(removeSignupCookie(request.cookies.get(SIGNUP_COOKIE)?.value, slug)),
  );
  return response;
}
