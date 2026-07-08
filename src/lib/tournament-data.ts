/**
 * Server-only data access for public tournament pages.
 *
 * Centralises DB reads so that status sync (OPEN → IN_PROGRESS → COMPLETED
 * by Hong Kong time) runs on every visit to the list page, detail page, or
 * the public API — without relying on a fragile self-fetch or a stale ISR
 * cache.
 */
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { displayStatus, syncTournamentStatuses } from "@/lib/tournament-status";
import type { TournamentItem } from "@/lib/types";

/** Statuses visible on user-facing pages (DRAFT hidden). */
const PUBLISHED_STATUSES = [
  "OPEN",
  "FULL",
  "IN_PROGRESS",
  "CANCELLED",
  "COMPLETED",
] as const;

/** A raw tournament row, including the registration count from `_count`. */
type TournamentRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  format: string;
  maxPlayers: number;
  entryFee: number;
  prizePool: string | null;
  location: string;
  startsAt: Date | string;
  registrationDeadline: Date | string;
  durationMinutes: number;
  status: string;
  _count?: { registrations: number };
  registeredCount?: number;
};

/** Map a Prisma row (or demo object) to the public `TournamentItem` shape. */
function mapToTournamentItem(t: TournamentRow): TournamentItem {
  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    description: t.description,
    format: t.format,
    maxPlayers: t.maxPlayers,
    entryFee: t.entryFee,
    prizePool: t.prizePool,
    location: t.location,
    startsAt:
      t.startsAt instanceof Date ? t.startsAt.toISOString() : t.startsAt,
    registrationDeadline:
      t.registrationDeadline instanceof Date
        ? t.registrationDeadline.toISOString()
        : t.registrationDeadline,
    durationMinutes: t.durationMinutes,
    status: displayStatus(
      t.status,
      t.startsAt,
      t.durationMinutes,
      t.registrationDeadline,
    ),
    registeredCount: t._count?.registrations ?? t.registeredCount ?? 0,
  };
}

/**
 * Fetch all tournaments visible to the public, lazily syncing statuses to the
 * current Hong Kong time first. Falls back to demo data when the database is
 * not configured or the query fails.
 */
export async function getPublishedTournaments(): Promise<TournamentItem[]> {
  if (!isDatabaseConfigured()) {
    return DEMO_TOURNAMENTS as TournamentItem[];
  }

  try {
    await syncTournamentStatuses(getPrisma());
    const tournaments = await getPrisma().tournament.findMany({
      where: { status: { in: [...PUBLISHED_STATUSES] } },
      include: { _count: { select: { registrations: true } } },
      orderBy: { startsAt: "asc" },
    });
    return tournaments.map(mapToTournamentItem);
  } catch (error) {
    console.error("getPublishedTournaments failed:", error);
    return DEMO_TOURNAMENTS as TournamentItem[];
  }
}

/**
 * Fetch a single published tournament by slug, lazily syncing statuses first.
 * Returns `null` when no published tournament matches (handles 404 / demo).
 */
export async function getTournamentBySlug(
  slug: string,
): Promise<TournamentItem | null> {
  if (!isDatabaseConfigured()) {
    return (
      (DEMO_TOURNAMENTS as TournamentItem[]).find((t) => t.slug === slug) ??
      null
    );
  }

  try {
    await syncTournamentStatuses(getPrisma());
    const tournament = await getPrisma().tournament.findFirst({
      where: { slug, status: { in: [...PUBLISHED_STATUSES] } },
      include: { _count: { select: { registrations: true } } },
    });
    return tournament ? mapToTournamentItem(tournament) : null;
  } catch (error) {
    console.error("getTournamentBySlug failed:", error);
    return (
      (DEMO_TOURNAMENTS as TournamentItem[]).find((t) => t.slug === slug) ??
      null
    );
  }
}
