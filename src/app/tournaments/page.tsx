import Link from "next/link";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { listPublicTournaments } from "@/lib/tournament-registrations";

export const metadata = {
  title: "店賽",
};

export default async function TournamentsPage() {
  const tournaments = await listPublicTournaments();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">店賽日程</h1>
          <p className="mt-2 text-muted-foreground">
            報名 Pokémon TCG 店賽 · 標準賽制 · 香港時間
          </p>
        </div>
        <Link
          href="/tournaments/live"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          計分板 / 計時
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
      </div>
    </div>
  );
}
