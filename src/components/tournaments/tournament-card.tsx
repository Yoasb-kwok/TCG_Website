import Link from "next/link";
import { Calendar, CalendarClock, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatDuration, formatPrice } from "@/lib/format";
import { statusBadgeClass, statusLabel } from "@/lib/tournament-ui";
import type { TournamentItem } from "@/lib/types";

interface TournamentCardProps {
  tournament: TournamentItem;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const isOpen = tournament.status === "OPEN" && spotsLeft > 0;
  const isFull =
    tournament.status === "FULL" ||
    (tournament.status === "OPEN" && spotsLeft <= 0);
  const isCancelled = tournament.status === "CANCELLED";
  const isClosed =
    tournament.status === "DEADLINE_PASSED" ||
    tournament.status === "COMPLETED";

  return (
    <Card
      className={cn(
        "border-border bg-card text-foreground",
        isCancelled && "opacity-60",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{tournament.title}</h3>
          <Badge
            variant="secondary"
            className={cn(
              statusBadgeClass(isFull ? "FULL" : tournament.status),
            )}
          >
            {isFull ? "已滿" : statusLabel(tournament.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{tournament.format}</p>
      </CardHeader>

      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {tournament.description && <p>{tournament.description}</p>}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          {formatDate(tournament.startsAt)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          {tournament.location}
        </div>
        {tournament.durationMinutes > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            時長：{formatDuration(tournament.durationMinutes)}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          {tournament.registeredCount} / {tournament.maxPlayers} 人
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0" />
          報名截止：{formatDate(tournament.registrationDeadline)}
        </div>
        {tournament.prizePool && (
          <p className="text-muted-foreground">獎品：{tournament.prizePool}</p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-semibold">
          {tournament.entryFee > 0 ? formatPrice(tournament.entryFee) : "免費"}
        </span>
        {isClosed || isCancelled ? (
          <span
            aria-disabled="true"
            className="inline-flex h-8 cursor-not-allowed items-center justify-center rounded-lg bg-white/40 px-3 text-sm font-medium text-black/40"
          >
            {isCancelled
              ? "已取消"
              : tournament.status === "COMPLETED"
                ? "已結束"
                : "已截止"}
          </span>
        ) : (
          <Link
            href={`/tournaments/${tournament.slug}/register`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          >
            {isOpen ? "立即報名" : "查看詳情"}
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
