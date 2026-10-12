import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, CalendarClock, MapPin, Users } from "lucide-react";
import { GoogleCalendarLink } from "@/components/tournaments/google-calendar-link";
import { RegistrationForm } from "@/components/tournaments/registration-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/format";
import { decodeRouteSlug, registrationClosedLabel } from "@/lib/registration-input";
import { getPublicTournament } from "@/lib/tournament-registrations";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "報名參賽",
};

export default async function TournamentRegisterPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const tournament = await getPublicTournament(slug);

  if (!tournament) notFound();

  const closedLabel = registrationClosedLabel(tournament);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <Link
        href="/tournaments"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 返回賽事列表
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-foreground">報名參賽</h1>

      <Card className="mt-6 border-border bg-card text-foreground">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{tournament.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{tournament.format}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {tournament.description && (
            <p className="text-foreground/80">{tournament.description}</p>
          )}
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>比賽時間：{formatDate(tournament.startsAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>地點：{tournament.location}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              已報名 {tournament.registeredCount} / {tournament.maxPlayers} 人
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span>報名截止：{formatDate(tournament.registrationDeadline)}</span>
          </div>
          {tournament.prizePool && (
            <p className="text-muted-foreground">獎品：{tournament.prizePool}</p>
          )}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">報名費</span>
            <span className="text-lg font-semibold text-foreground">
              {tournament.entryFee > 0 ? formatPrice(tournament.entryFee) : "免費"}
            </span>
          </div>
          <GoogleCalendarLink tournament={tournament} />
        </CardContent>
      </Card>

      <RegistrationForm
        slug={tournament.slug}
        title={tournament.title}
        startsAt={tournament.startsAt}
        location={tournament.location}
        closedLabel={closedLabel}
      />
    </div>
  );
}
