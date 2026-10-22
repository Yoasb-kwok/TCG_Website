import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  SIGNUP_COOKIE,
  listPublicTournaments,
  listRegistrationRosters,
  parseSignupCookie,
  viewerOwnedSlugs,
  viewerRegisteredSlugs,
} from "@/lib/tournament-registrations";

/** Storefront tournament cards: names only, plus whether this visitor already signed up. */
export const loadPublicTournamentView = cache(async () => {
  const [tournaments, rosters, session, cookieStore] = await Promise.all([
    listPublicTournaments(),
    listRegistrationRosters(),
    auth(),
    cookies(),
  ]);
  const namesBySlug = new Map(
    rosters.map((roster) => [roster.slug, roster.registrations.map((row) => row.playerName)]),
  );
  const accountUserId = session?.user?.id ?? null;
  const accountEmail = session?.user?.email ?? null;
  const registeredSlugs = viewerRegisteredSlugs(rosters, {
    email: accountEmail,
    userId: accountUserId,
    signedSlugs: parseSignupCookie(cookieStore.get(SIGNUP_COOKIE)?.value),
  });
  const ownedSlugs =
    accountUserId && accountEmail
      ? viewerOwnedSlugs(rosters, { email: accountEmail, userId: accountUserId })
      : new Set<string>();
  return {
    tournaments,
    namesBySlug,
    registeredSlugs,
    ownedSlugs,
    accountEmail,
    accountName: session?.user?.name ?? null,
    isAdmin: session?.user?.role === "ADMIN",
  };
});
