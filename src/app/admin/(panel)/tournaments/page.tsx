"use client";

import { useEffect, useState } from "react";
import { formatDate, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STORE } from "@/lib/constants";

interface Registration {
  id: string;
  playerName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

interface Tournament {
  id: string;
  title: string;
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店賽報名</h1>
          <p className="mt-1 text-sm text-muted-foreground">賽事管理及報名名單</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "取消" : "新增賽事"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={createTournament}
          className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label>賽事名稱</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div>
            <Label>賽制</Label>
            <Input
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div>
            <Label>名額</Label>
            <Input
              type="number"
              value={form.maxPlayers}
              onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div>
            <Label>報名費 (HKD)</Label>
            <Input
              type="number"
              value={form.entryFee}
              onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div>
            <Label>地點</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div>
            <Label>比賽時間</Label>
            <Input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div>
            <Label>報名截止</Label>
            <Input
              type="datetime-local"
              required
              value={form.registrationDeadline}
              onChange={(e) =>
                setForm({ ...form, registrationDeadline: e.target.value })
              }
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>獎品（選填）</Label>
            <Input
              value={form.prizePool}
              onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              className="mt-1 border-border bg-black text-foreground"
            />
          </div>
          <Button type="submit" className="sm:col-span-2 bg-primary text-primary-foreground">
            建立賽事
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-border bg-card"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div>
                <p className="font-semibold text-foreground">{t.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(t.startsAt)} · {t.location} · {t.format}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-pink-400">
                  {t._count.registrations} / {t.maxPlayers} 人
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {t.entryFee > 0 ? formatPrice(t.entryFee) : "免費"}
                </p>
              </div>
            </button>

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
                          <td className="py-2 text-muted-foreground">{r.email}</td>
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
          <p className="py-12 text-center text-muted-foreground/80">
            尚無賽事，點擊「新增賽事」建立
          </p>
        )}
      </div>
    </div>
  );
}
