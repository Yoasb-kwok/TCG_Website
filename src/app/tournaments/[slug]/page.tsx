import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";
import { GoogleCalendarLink } from "@/components/tournaments/google-calendar-link";
import { formatDate, formatPrice } from "@/lib/format";
import { decodeRouteSlug, registrationClosedLabel } from "@/lib/registration-input";
import { liveBoardHref } from "@/lib/tournament-board";
import { getPublicTournament } from "@/lib/tournament-registrations";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const tournament = await getPublicTournament(slug);

  if (!tournament) notFound();

  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const closedLabel = registrationClosedLabel(tournament);

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
              尚餘 {spotsLeft} 位（{tournament.registeredCount} / {tournament.maxPlayers}）
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
            {tournament.entryFee > 0 ? formatPrice(tournament.entryFee) : "免費"}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={liveBoardHref(tournament)}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
        >
          開始店賽
        </Link>
        {closedLabel ? (
          <p className="text-sm text-muted-foreground">{closedLabel}</p>
        ) : (
          <Link
            href={`/tournaments/${tournament.slug}/register`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          >
            立即報名
          </Link>
        )}
        <GoogleCalendarLink tournament={tournament} />
      </div>
    </div>
  );
}
