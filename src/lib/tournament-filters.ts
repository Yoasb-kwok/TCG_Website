/**
 * Pure client-side tournament filtering and sorting logic.
 *
 * Shared by the public tournament list (`TournamentBrowser`) and the admin
 * monitor page so both surfaces apply identical filter semantics.
 */

/** Minimal shape required for filtering — both `TournamentItem` and the
 *  admin `Tournament` interface satisfy this. */
export interface FilterableTournament {
  title: string;
  format: string;
  entryFee: number;
  prizePool: string | null;
  status: string;
  startsAt: string;
  /** Needed to compute DEADLINE_PASSED for admin filter. */
  registrationDeadline?: string;
}

export type FeeFilter = "all" | "free" | "paid";
export type PrizeFilter = "all" | "has" | "none";
export type SortMode = "nearest" | "earliest" | "latest";

export interface TournamentFilterState {
  search: string;
  format: string; // "" = all
  status: string; // "" = all
  feeType: FeeFilter;
  prizeType: PrizeFilter;
  sort: SortMode;
}

export const DEFAULT_FILTERS: TournamentFilterState = {
  search: "",
  format: "",
  status: "",
  feeType: "all",
  prizeType: "all",
  sort: "nearest",
};

/** Extract unique, sorted format strings from a tournament list. */
export function extractFormats(tournaments: FilterableTournament[]): string[] {
  const set = new Set<string>();
  for (const t of tournaments) {
    if (t.format) set.add(t.format);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function hasPrize(t: FilterableTournament): boolean {
  return Boolean(t.prizePool?.trim());
}

/**
 * Apply all active filters, then sort the result.
 *
 * `now` is an epoch-ms timestamp — pass it from the server component to keep
 * it stable per page load (avoids hydration mismatch and jitter).
 */
export function filterTournaments<T extends FilterableTournament>(
  tournaments: T[],
  filters: TournamentFilterState,
  now: number,
): T[] {
  const q = filters.search.trim().toLowerCase();

  let result = tournaments.filter((t) => {
    // Title search (case-insensitive substring)
    if (q && !t.title.toLowerCase().includes(q)) return false;

    // Format (case-insensitive substring match)
    if (
      filters.format &&
      !t.format.toLowerCase().includes(filters.format.toLowerCase())
    )
      return false;

    // Status — DEADLINE_PASSED is computed (OPEN/FULL past deadline),
    // never stored in DB, so check it separately.
    if (filters.status === "DEADLINE_PASSED") {
      const isPreEvent = t.status === "OPEN" || t.status === "FULL";
      const deadline = t.registrationDeadline
        ? new Date(t.registrationDeadline).getTime()
        : NaN;
      if (!isPreEvent || Number.isNaN(deadline) || deadline >= now)
        return false;
    } else if (filters.status && t.status !== filters.status) {
      return false;
    }

    // Fee type
    if (filters.feeType === "free" && Number(t.entryFee) > 0) return false;
    if (filters.feeType === "paid" && Number(t.entryFee) === 0) return false;

    // Prize
    if (filters.prizeType === "has" && !hasPrize(t)) return false;
    if (filters.prizeType === "none" && hasPrize(t)) return false;

    return true;
  });

  // Sort
  switch (filters.sort) {
    case "nearest":
      result = [...result].sort(
        (a, b) =>
          Math.abs(new Date(a.startsAt).getTime() - now) -
          Math.abs(new Date(b.startsAt).getTime() - now),
      );
      break;
    case "earliest":
      result = [...result].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
      break;
    case "latest":
      result = [...result].sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
      break;
  }

  return result;
}

/** Count how many filters differ from the defaults (for "清除" badge). */
export function activeFilterCount(filters: TournamentFilterState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.format) count++;
  if (filters.status) count++;
  if (filters.feeType !== "all") count++;
  if (filters.prizeType !== "all") count++;
  if (filters.sort !== "nearest") count++;
  return count;
}
