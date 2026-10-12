import { CalendarPlus } from "lucide-react";
import { tournamentCalendarUrl } from "@/lib/format";
import type { TournamentItem } from "@/lib/types";

type CalendarTournament = Pick<
  TournamentItem,
  "title" | "startsAt" | "location" | "description" | "format" | "status"
>;

export function GoogleCalendarLink({ tournament }: { tournament: CalendarTournament }) {
  const href = tournamentCalendarUrl(tournament);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <CalendarPlus className="h-4 w-4" />
      加入 Google 日曆
    </a>
  );
}
