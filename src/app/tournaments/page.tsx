import Link from "next/link";
import { StaffBoardLinks } from "@/components/tournaments/staff-board-links";
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
        <div className="flex flex-wrap items-center gap-3">
          <StaffBoardLinks />
          <Link
            href="/tournaments/live"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            現場計分板
          </Link>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">暫無即將舉行的店賽</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
