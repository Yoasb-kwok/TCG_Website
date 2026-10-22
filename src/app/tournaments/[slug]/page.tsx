import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";
import { GoogleCalendarLink } from "@/components/tournaments/google-calendar-link";
import { RegistrantNames } from "@/components/tournaments/registrant-names";
import { TournamentCustomerActions } from "@/components/tournaments/customer-actions";
import { formatDate, formatPrice } from "@/lib/format";
import { loadPublicTournamentView } from "@/lib/public-tournament-view";
import { decodeRouteSlug, registrationClosedLabel } from "@/lib/registration-input";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const { tournaments, namesBySlug, registeredSlugs, isAdmin } = await loadPublicTournamentView();
  const tournament = tournaments.find((item) => item.slug === slug);

  if (!tournament) notFound();

  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const closedLabel = registrationClosedLabel(tournament);
  const signedUp = registeredSlugs.has(tournament.slug);

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

      <div className="mt-8">
        <RegistrantNames names={namesBySlug.get(tournament.slug) ?? []} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <TournamentCustomerActions
          slug={tournament.slug}
          canRegister={!closedLabel}
          signedUp={signedUp}
          closedLabel={closedLabel}
          showScoreboard={isAdmin}
          detailsCurrent
        />
        <GoogleCalendarLink tournament={tournament} />
      </div>
    </div>
  );
}
