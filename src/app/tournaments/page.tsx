import { TournamentCard } from "@/components/tournaments/tournament-card";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";

export const metadata = {
  title: "店賽",
};

async function getTournaments() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/tournaments`, {
      next: { revalidate: 60 },
    });
    const data = (await res.json()) as { tournaments: typeof DEMO_TOURNAMENTS };
    return data.tournaments;
  } catch {
    return DEMO_TOURNAMENTS;
  }
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments();

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
