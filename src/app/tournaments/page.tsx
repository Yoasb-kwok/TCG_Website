import { TournamentBrowser } from "@/components/tournaments/tournament-browser";
import { getPublishedTournaments } from "@/lib/tournament-data";

export const metadata = {
  title: "店賽",
};

// Dynamic: query the DB on every visit so tournament statuses are synced
// (OPEN → IN_PROGRESS → COMPLETED) to the current Hong Kong time.
export const dynamic = "force-dynamic";

/** Today's HK calendar date as "YYYY-MM-DD" — computed server-side to avoid hydration mismatch. */
const HK_DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getHKTodayKey(): string {
  return HK_DAY_FMT.format(new Date());
}

/** Compute the current HK month as an ISO string for the calendar's initial view. */
function getInitialMonthISO(): string {
  const parts = HK_DAY_FMT.formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);

  // Noon UTC on the 1st avoids any timezone edge-case shifting the day.
  return new Date(Date.UTC(year, month - 1, 1, 12)).toISOString();
}

export default async function TournamentsPage() {
  const tournaments = await getPublishedTournaments();
  const initialMonth = getInitialMonthISO();
  const todayKey = getHKTodayKey();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <h1 className="text-2xl font-bold text-foreground">店賽日程</h1>
      <p className="mt-2 text-muted-foreground">
        報名 Pokémon TCG 店賽 · 標準賽制 · 香港時間
      </p>

      <div className="mt-8">
        <TournamentBrowser
          tournaments={tournaments}
          initialMonth={initialMonth}
          todayKey={todayKey}
          now={Date.now()}
        />
      </div>
    </div>
  );
}
