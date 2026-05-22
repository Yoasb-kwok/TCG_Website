import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/format";
import type { TournamentItem } from "@/lib/types";

interface TournamentCardProps {
  tournament: TournamentItem;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "報名中",
  FULL: "已滿",
  IN_PROGRESS: "進行中",
  COMPLETED: "已結束",
  DRAFT: "草稿",
  CANCELLED: "已取消",
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const isOpen = tournament.status === "OPEN" && spotsLeft > 0;

  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{tournament.title}</h3>
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className={isOpen ? "bg-green-600" : ""}
          >
            {STATUS_LABELS[tournament.status] ?? tournament.status}
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
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          {tournament.registeredCount} / {tournament.maxPlayers} 人
        </div>
        {tournament.prizePool && (
          <p className="text-muted-foreground">獎品：{tournament.prizePool}</p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-semibold">
          {tournament.entryFee > 0
            ? formatPrice(tournament.entryFee)
            : "免費"}
        </span>
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50"
          aria-disabled={!isOpen}
        >
          {isOpen ? "立即報名" : "查看詳情"}
        </Link>
      </CardFooter>
    </Card>
  );
}
