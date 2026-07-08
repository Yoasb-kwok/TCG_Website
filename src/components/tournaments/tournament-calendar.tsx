"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatPrice } from "@/lib/format";
import { statusBadgeClass, statusLabel } from "@/lib/tournament-ui";
import type { TournamentItem } from "@/lib/types";

/** Weekday headers — week starts on Sunday. */
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/** Max chips shown in a desktop cell before the "+N more" expand toggle. */
const MAX_CHIPS = 3;

const DOT_CLASSES: Record<string, string> = {
  OPEN: "bg-green-500",
  FULL: "bg-orange-500",
  IN_PROGRESS: "bg-blue-500",
  DEADLINE_PASSED: "bg-gray-400",
  COMPLETED: "bg-slate-500",
  CANCELLED: "bg-red-500",
};

const CHIP_CLASSES: Record<string, string> = {
  OPEN: "bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-300",
  FULL: "bg-orange-500/15 text-orange-700 hover:bg-orange-500/25 dark:text-orange-300",
  IN_PROGRESS:
    "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-300",
  DEADLINE_PASSED: "bg-muted text-muted-foreground hover:bg-muted/80",
  COMPLETED:
    "bg-slate-500/15 text-slate-600 hover:bg-slate-500/25 dark:text-slate-400",
  CANCELLED:
    "bg-red-500/15 text-red-700 hover:bg-red-500/25 line-through dark:text-red-300",
};

const DEFAULT_CHIP = "bg-muted text-muted-foreground hover:bg-muted/80";

/**
 * Status sort priority within a calendar day.
 * Lower number = shown first (higher priority).
 * Order: CANCELLED > COMPLETED > IN_PROGRESS > DEADLINE_PASSED > FULL > OPEN.
 */
const STATUS_SORT_PRIORITY: Record<string, number> = {
  CANCELLED: 0,
  COMPLETED: 1,
  IN_PROGRESS: 2,
  DEADLINE_PASSED: 3,
  FULL: 4,
  OPEN: 5,
};

function statusSortValue(status: string): number {
  return STATUS_SORT_PRIORITY[status] ?? 99;
}

/**
 * Group a UTC ISO string into a "YYYY-MM-DD" key representing the Hong Kong
 * calendar day. Using `Intl.DateTimeFormat` with `timeZone: "Asia/Hong_Kong"`
 * ensures tournaments are placed on the correct HK day regardless of the
 * viewer's local timezone.
 */
const HK_DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function hkDayKey(iso: string): string {
  return HK_DAY_FMT.format(new Date(iso)); // "YYYY-MM-DD"
}

/** "14:00" — HH:mm in Hong Kong time. */
function hkTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Parse a "YYYY-MM-DD" key into a local Date (avoids UTC-midnight shift). */
function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface CalendarProps {
  tournaments: TournamentItem[];
  /** ISO string anchored to the initial month to display (server-computed). */
  initialMonth: string;
  /** Today's HK calendar date as "YYYY-MM-DD" (server-computed). */
  todayKey: string;
}

export function TournamentCalendar({
  tournaments,
  initialMonth,
  todayKey,
}: CalendarProps) {
  const [monthDate, setMonthDate] = useState(() => new Date(initialMonth));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Mobile day-dialog state
  const [dayDialogKey, setDayDialogKey] = useState<string | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  // Desktop detail-dialog state
  const [detailTournament, setDetailTournament] =
    useState<TournamentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Group tournaments by HK calendar day, sorted by start time.
  const byDay = useMemo(() => {
    const map = new Map<string, TournamentItem[]>();
    for (const t of tournaments) {
      const key = hkDayKey(t.startsAt);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    // Sort each day's tournaments by status priority, then by start time.
    // Priority: CANCELLED > COMPLETED > IN_PROGRESS > DEADLINE_PASSED > FULL > OPEN.
    for (const list of map.values()) {
      list.sort((a, b) => {
        const priorityDiff =
          statusSortValue(a.status) - statusSortValue(b.status);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      });
    }
    return map;
  }, [tournaments]);

  // Build a 6-week (42-day) grid starting from the Sunday before the 1st.
  const days = useMemo(() => {
    const mStart = startOfMonth(monthDate);
    const gridStart = startOfWeek(mStart, { weekStartsOn: 0 });
    const mEnd = endOfMonth(monthDate);
    const gridEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthDate]);

  const monthLabel = format(monthDate, "yyyy 年 M 月", { locale: zhTW });
  const dayEvents = dayDialogKey ? (byDay.get(dayDialogKey) ?? []) : [];

  const openDetail = (t: TournamentItem) => {
    setDetailTournament(t);
    setDetailOpen(true);
  };

  const openDayDialog = (key: string) => {
    setDayDialogKey(key);
    setDayDialogOpen(true);
  };

  const toggleExpand = (key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const goToday = () => setMonthDate(new Date(initialMonth));

  return (
    <div className="space-y-3">
      {/* Header: month label + navigation */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setMonthDate((d) => addMonths(d, -1))}
            aria-label="上個月"
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            今日
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setMonthDate((d) => addMonths(d, 1))}
            aria-label="下個月"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          報名中
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          已滿
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          進行中
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          已截止
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          已結束
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          已取消
        </span>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const events = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthDate);
          const isToday = key === todayKey;
          const isExpanded = expandedDays.has(key);
          const visibleChips = isExpanded ? events : events.slice(0, MAX_CHIPS);

          return (
            <div
              key={key}
              className={cn(
                "relative min-h-13 rounded-md border p-1 sm:min-h-26 sm:p-1.5",
                inMonth ? "bg-card" : "bg-muted/30",
                isToday && "ring-2 ring-primary",
              )}
            >
              {/* Date number */}
              <div
                className={cn(
                  "mb-0.5 text-xs font-medium sm:text-sm",
                  inMonth ? "text-foreground" : "text-muted-foreground/40",
                  isToday && "font-bold text-primary",
                )}
              >
                {format(day, "d")}
              </div>

              {/* Mobile: status dots */}
              {events.length > 0 && (
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {events.slice(0, 5).map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        DOT_CLASSES[t.status] ?? "bg-gray-400",
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Desktop: tournament chips */}
              {events.length > 0 && (
                <div className="hidden flex-col gap-0.5 sm:flex">
                  {visibleChips.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(t);
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded px-1 py-0.5 text-left text-xs transition-colors",
                        CHIP_CLASSES[t.status] ?? DEFAULT_CHIP,
                      )}
                    >
                      <span className="shrink-0 font-medium tabular-nums">
                        {hkTimeLabel(t.startsAt)}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                  {events.length > MAX_CHIPS && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(key)}
                      className="text-left text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded
                        ? "收起"
                        : `還有 ${events.length - MAX_CHIPS} 場`}
                    </button>
                  )}
                </div>
              )}

              {/* Mobile: invisible tap target over the whole cell */}
              {events.length > 0 && (
                <button
                  type="button"
                  className="absolute inset-0 cursor-pointer rounded-md sm:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDayDialog(key);
                  }}
                  aria-label={`查看 ${format(day, "M月d日")} 的 ${events.length} 場賽事`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile day dialog — lists that day's tournaments */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {dayDialogKey && (
            <>
              <DialogHeader>
                <DialogTitle>{dayEvents.length} 場賽事</DialogTitle>
                <DialogDescription>
                  {format(parseDayKey(dayDialogKey), "M 月 d 日 EEEE", {
                    locale: zhTW,
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-4">
                {dayEvents.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.slug}/register`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {hkTimeLabel(t.startsAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.format} · {t.location}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(t.status)}
                    >
                      {statusLabel(t.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Desktop detail dialog — tournament info + register button */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          {detailTournament && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 pr-6">
                  <DialogTitle className="text-base">
                    {detailTournament.title}
                  </DialogTitle>
                  <Badge
                    variant="secondary"
                    className={statusBadgeClass(detailTournament.status)}
                  >
                    {statusLabel(detailTournament.status)}
                  </Badge>
                </div>
                <DialogDescription>{detailTournament.format}</DialogDescription>
              </DialogHeader>

              {detailTournament.description && (
                <p className="text-sm text-muted-foreground">
                  {detailTournament.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {formatDate(detailTournament.startsAt)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {detailTournament.location}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {detailTournament.registeredCount} /{" "}
                  {detailTournament.maxPlayers} 人
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold">
                  {detailTournament.entryFee > 0
                    ? formatPrice(detailTournament.entryFee)
                    : "免費"}
                </span>
                <Link
                  href={`/tournaments/${detailTournament.slug}/register`}
                  className={buttonVariants()}
                >
                  {detailTournament.status === "OPEN" ? "立即報名" : "查看詳情"}
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
