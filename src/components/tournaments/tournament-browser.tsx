"use client";

import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentCalendar } from "@/components/tournaments/tournament-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TournamentItem } from "@/lib/types";

interface TournamentBrowserProps {
  tournaments: TournamentItem[];
  /** ISO string anchored to the initial month (server-computed, HK time). */
  initialMonth: string;
  /** Today's HK calendar date as "YYYY-MM-DD" (server-computed). */
  todayKey: string;
}

export function TournamentBrowser({
  tournaments,
  initialMonth,
  todayKey,
}: TournamentBrowserProps) {
  return (
    <Tabs defaultValue="calendar">
      <TabsList>
        <TabsTrigger value="calendar">行事曆</TabsTrigger>
        <TabsTrigger value="list">列表</TabsTrigger>
      </TabsList>

      <TabsContent value="calendar">
        <TournamentCalendar
          tournaments={tournaments}
          initialMonth={initialMonth}
          todayKey={todayKey}
        />
      </TabsContent>

      <TabsContent value="list">
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
