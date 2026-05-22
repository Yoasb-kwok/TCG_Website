import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { formatDate, formatPrice } from "@/lib/format";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tournament = DEMO_TOURNAMENTS.find((t) => t.slug === slug);

  if (!tournament) notFound();

  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <Link href="/tournaments" className="text-sm text-muted-foreground hover:text-foreground">
        ← 返回賽事列表
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-foreground">{tournament.title}</h1>
      <p className="mt-2 text-muted-foreground">{tournament.format}</p>

      {tournament.description && (
        <p className="mt-6 text-foreground/80">{tournament.description}</p>
      )}

      <dl className="mt-8 space-y-4 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <div>
            <dt className="text-muted-foreground">比賽時間</dt>
            <dd className="text-foreground">{formatDate(tournament.startsAt)}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <div>
            <dt className="text-muted-foreground">地點</dt>
            <dd className="text-foreground">{tournament.location}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Users className="h-5 w-5" />
          <div>
            <dt className="text-muted-foreground">名額</dt>
            <dd className="text-foreground">
              尚餘 {spotsLeft} 位（{tournament.registeredCount} /{" "}
              {tournament.maxPlayers}）
            </dd>
          </div>
        </div>
        {tournament.prizePool && (
          <div>
            <dt className="text-muted-foreground">獎品</dt>
            <dd className="text-foreground">{tournament.prizePool}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">報名費</dt>
          <dd className="text-lg font-semibold text-foreground">
            {tournament.entryFee > 0
              ? formatPrice(tournament.entryFee)
              : "免費"}
          </dd>
        </div>
      </dl>

      <Button
        className="mt-8 bg-white text-black hover:bg-white/90"
        disabled={spotsLeft <= 0}
      >
        {spotsLeft > 0 ? "立即報名（即將推出）" : "名額已滿"}
      </Button>
    </div>
  );
}
