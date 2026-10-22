import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  SIGNUP_COOKIE,
  listPublicTournaments,
  listRegistrationRosters,
  parseSignupCookie,
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
  const registeredSlugs = viewerRegisteredSlugs(rosters, {
    email: session?.user?.email,
    signedSlugs: parseSignupCookie(cookieStore.get(SIGNUP_COOKIE)?.value),
  });
  return {
    tournaments,
    namesBySlug,
    registeredSlugs,
    isAdmin: session?.user?.role === "ADMIN",
  };
});
