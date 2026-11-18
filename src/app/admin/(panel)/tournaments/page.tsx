"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate, formatPrice } from "@/lib/format";
import Link from "next/link";
import { AdminMetric, AdminPageHeader, adminCardClass } from "@/components/admin/admin-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StaffBoardLinks } from "@/components/tournaments/staff-board-links";
import { liveBoardHref } from "@/lib/tournament-board";

interface Registration {
  id: string;
  playerName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface Tournament {
  id: string;
  title: string;
  slug?: string;
  format: string;
  maxPlayers: number;
  entryFee: number;
  location: string;
  startsAt: string;
  status: string;
  _count: { registrations: number };
  registrations: Registration[];
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    format: "Standard",
    maxPlayers: "32",
    entryFee: "80",
    location: "門市",
    startsAt: "",
    registrationDeadline: "",
    prizePool: "",
  });

  const load = async () => {
    const res = await fetch("/api/admin/tournaments");
    const data = (await res.json()) as { tournaments: Tournament[] };
    setTournaments(data.tournaments ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maxPlayers: Number(form.maxPlayers),
        entryFee: Number(form.entryFee),
      }),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    }
  };

  const summary = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let upcoming = 0;
    let monthRegistrations = 0;
    let openSeats = 0;
    for (const tournament of tournaments) {
      if (new Date(tournament.startsAt).getTime() >= now.getTime()) upcoming += 1;
      openSeats += Math.max(0, tournament.maxPlayers - tournament._count.registrations);
      for (const registration of tournament.registrations) {
        const created = new Date(registration.createdAt);
        if (created.getFullYear() === year && created.getMonth() === month) {
          monthRegistrations += 1;
        }
      }
    }
    return { upcoming, monthRegistrations, openSeats };
  }, [tournaments]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="店賽報名"
        description="建立賽事、管理名額與快速進入店內計分工具。現場計時同比分由「計分板 / 計時」寫入。"
        action={
          <Button type="button" variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "取消" : "新增賽事"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StaffBoardLinks />
        <Link
          href="/tournaments/live"
          target="_blank"
          className={buttonVariants({ variant: "quiet" })}
        >
          公開計分板
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <AdminMetric label="即將舉行" value={String(summary.upcoming)} stack="value" tone="lavender" />
        <AdminMetric label="本月報名" value={String(summary.monthRegistrations)} stack="value" />
        <AdminMetric label="可用名額" value={String(summary.openSeats)} stack="value" tone="lime" />
      </div>

      {showForm && (
        <form
          onSubmit={createTournament}
          className={cn(adminCardClass, "grid gap-4 sm:grid-cols-2")}
        >
          <div className="sm:col-span-2">
            <Label>賽事名稱</Label>
            <Input variant="foundation"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>賽制</Label>
            <Input variant="foundation"
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>名額</Label>
            <Input variant="foundation"
              type="number"
              value={form.maxPlayers}
              onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>報名費 (HKD)</Label>
            <Input variant="foundation"
              type="number"
              value={form.entryFee}
              onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>地點</Label>
            <Input variant="foundation"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>比賽時間</Label>
            <Input variant="foundation"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>報名截止</Label>
            <Input variant="foundation"
              type="datetime-local"
              required
              value={form.registrationDeadline}
              onChange={(e) =>
                setForm({ ...form, registrationDeadline: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>獎品（選填）</Label>
            <Input variant="foundation"
              value={form.prizePool}
              onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="primary" className="sm:col-span-2 w-fit">
            建立賽事
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className={adminCardClass}
          >
            <div className="flex items-center justify-between gap-3 p-5">
              <button
                type="button"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="font-semibold text-foreground">{t.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(t.startsAt)} · {t.location} · {t.format}
                </p>
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-trtcg-secondary-border">
                    {t._count.registrations} / {t.maxPlayers} 人
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {t.entryFee > 0 ? formatPrice(t.entryFee) : "免費"}
                  </p>
                </div>
                <Link
                  href={liveBoardHref(t)}
                  target="_blank"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  本機計分
                </Link>
              </div>
            </div>

            {expanded === t.id && (
              <div className="border-t border-border px-5 pb-5">
                {t.registrations.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground/80">暫無報名</p>
                ) : (
                  <table className="mt-4 w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="pb-2">選手</th>
                        <th className="pb-2">電郵</th>
                        <th className="pb-2">電話</th>
                        <th className="pb-2">報名時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.registrations.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="py-2 text-foreground">{r.playerName}</td>
                          <td className="py-2 text-muted-foreground">{r.email ?? "—"}</td>
                          <td className="py-2 text-muted-foreground">{r.phone ?? "—"}</td>
                          <td className="py-2 text-muted-foreground">
                            {formatDate(r.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {tournaments.length === 0 && (
          <div className={cn(adminCardClass, "flex flex-col items-center gap-4 py-10 text-center")}>
            <p className="text-[28px] font-bold leading-[1.4]">尚未建立賽事</p>
            <p className="max-w-xl text-[16px] leading-[1.65] text-trtcg-muted">
              建立第一場店賽後，報名名單、付款狀態與計分入口會在這裡顯示。
            </p>
            <Button type="button" variant="primary" onClick={() => setShowForm(true)}>
              新增賽事
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
