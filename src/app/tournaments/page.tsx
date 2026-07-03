import { TournamentCard } from "@/components/tournaments/tournament-card";
import { getPublishedTournaments } from "@/lib/tournament-data";

export const metadata = {
  title: "店賽",
};

// Dynamic: query the DB on every visit so tournament statuses are synced
// (OPEN → IN_PROGRESS → COMPLETED) to the current Hong Kong time.
export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await getPublishedTournaments();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <h1 className="text-2xl font-bold text-foreground">店賽日程</h1>
      <p className="mt-2 text-muted-foreground">
        報名 Pokémon TCG 店賽 · 標準賽制 · 香港時間
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
      </div>
    </div>
  );
}
