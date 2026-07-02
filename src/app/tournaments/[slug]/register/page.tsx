"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CalendarPlus, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { formatDate, formatPrice, googleCalendarUrl } from "@/lib/format";
import type { TournamentItem } from "@/lib/types";

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<TournamentItem | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [form, setForm] = useState({ playerName: "", email: "", phone: "" });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const res = await fetch(`${base}/api/tournaments`);
        const data = await res.json();
        const found = data.tournaments?.find(
          (t: TournamentItem) => t.slug === slug,
        );
        if (found) {
          setTournament(found);
          setLoadingTournament(false);
          return;
        }
      } catch {
        // Fall through to demo data
      }
      const found = DEMO_TOURNAMENTS.find((t) => t.slug === slug) as
        | TournamentItem
        | undefined;
      setTournament(found ?? null);
      setLoadingTournament(false);
    }
    load();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tournament?.id) {
      setError("賽事資料錯誤，請重新載入頁面");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/tournaments/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          playerName: form.playerName,
          email: form.email,
          phone: form.phone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "報名失敗，請重試");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setError("網絡錯誤，請檢查連接後重試");
      setStatus("error");
    }
  };

  // Loading state
  if (loadingTournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-9 w-48 rounded bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  // Not found
  if (!tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-6">
        <p className="text-lg text-muted-foreground">賽事不存在</p>
        <Button className="mt-6" onClick={() => router.push("/tournaments")}>
          返回賽事列表
        </Button>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <svg
            className="h-8 w-8 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">報名成功！</h2>
        <p className="mt-3 text-muted-foreground">
          你已成功報名{" "}
          <span className="font-medium text-foreground">
            {tournament.title}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(tournament.startsAt)} · {tournament.location}
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => router.push("/tournaments")}>
            返回賽事列表
          </Button>
          <Button onClick={() => router.push("/")}>返回首頁</Button>
        </div>
      </div>
    );
  }

  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const isFull = spotsLeft <= 0 || tournament.status !== "OPEN";

  const isPast = new Date(tournament.startsAt) < new Date();
  const isFinished =
    tournament.status === "COMPLETED" || tournament.status === "CANCELLED";
  const calendarUrl = googleCalendarUrl({
    title: tournament.title,
    startsAt: tournament.startsAt,
    location: tournament.location,
    description: tournament.description,
    format: tournament.format,
  });
  const showCalendarButton = Boolean(calendarUrl) && !isPast && !isFinished;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      {/* Back link */}
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回賽事列表
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-foreground">報名參賽</h1>

      {/* Tournament Summary Card */}
      <Card className="mt-6 border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{tournament.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{tournament.format}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">報名費</span>
            <span className="text-lg font-semibold text-foreground">
              {tournament.entryFee > 0
                ? formatPrice(tournament.entryFee)
                : "免費"}
            </span>
          </div>

          {showCalendarButton && (
            <a
              href={calendarUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <CalendarPlus className="h-4 w-4" />
              加入 Google 日曆
            </a>
          )}
        </CardContent>
      </Card>

      {/* Registration Form */}
      {isFull ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium text-foreground">名額已滿</p>
          <p className="mt-2 text-sm text-muted-foreground">
            此賽事已不再接受報名
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => router.push("/tournaments")}
          >
            查看其他賽事
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-5 text-lg font-semibold text-foreground">
              參賽者資料
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="playerName" className="mb-1.5 block">
                  姓名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="playerName"
                  required
                  placeholder="你的中文或英文姓名"
                  value={form.playerName}
                  onChange={(e) =>
                    setForm({ ...form, playerName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="email" className="mb-1.5 block">
                  電郵 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone" className="mb-1.5 block">
                  電話{" "}
                  <span className="text-xs text-muted-foreground">
                    （選填）
                  </span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876 5432"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-white text-black hover:bg-white/90"
          >
            {status === "loading" ? "報名中..." : "確認報名"}
          </Button>
        </form>
      )}
    </div>
  );
}
