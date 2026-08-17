"use client";

import { useMemo, useState } from "react";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentCalendar } from "@/components/tournaments/tournament-calendar";
import { TournamentFilters } from "@/components/tournaments/tournament-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_FILTERS,
  filterTournaments,
  type TournamentFilterState,
} from "@/lib/tournament-filters";
import type { TournamentItem } from "@/lib/types";

interface TournamentBrowserProps {
  tournaments: TournamentItem[];
  /** ISO string anchored to the initial month (server-computed, HK time). */
  initialMonth: string;
  /** Today's HK calendar date as "YYYY-MM-DD" (server-computed). */
  todayKey: string;
  /** Epoch ms for "nearest" sort (server-computed, stable per page load). */
  now: number;
}

/** Display statuses shown on the public list (no DRAFT). */
const PUBLIC_STATUSES = [
  "OPEN",
  "FULL",
  "IN_PROGRESS",
  "DEADLINE_PASSED",
  "COMPLETED",
  "CANCELLED",
];

export function TournamentBrowser({
  tournaments,
  initialMonth,
  todayKey,
  now,
}: TournamentBrowserProps) {
  const [filters, setFilters] =
    useState<TournamentFilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(
    () => filterTournaments(tournaments, filters, now),
    [tournaments, filters, now],
  );

  return (
    <div className="space-y-4">
      <TournamentFilters
        filters={filters}
        onChange={setFilters}
        statuses={PUBLIC_STATUSES}
      />

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">行事曆</TabsTrigger>
          <TabsTrigger value="list">列表</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <TournamentCalendar
              tournaments={filtered}
              initialMonth={initialMonth}
              todayKey={todayKey}
            />
          )}
        </TabsContent>

        <TabsContent value="list">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card py-16 text-center">
      <p className="text-muted-foreground">沒有符合條件的賽事</p>
    </div>
  );
}
