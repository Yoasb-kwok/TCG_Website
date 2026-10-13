"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { normalizePhone } from "@/lib/registration-input";

function StartTournamentLink() {
  return (
    <Link
      href="/tournaments/live"
      className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
    >
      現場計分板
    </Link>
  );
}

export function RegistrationForm({
  slug,
  title,
  startsAt,
  location,
  closedLabel,
}: {
  slug: string;
  title: string;
  startsAt: string;
  location: string;
  closedLabel: string | null;
}) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const phoneHint =
    phone.trim() && !normalizePhone(phone)
      ? `電話號碼必須為 8 位數字（目前 ${phone.replace(/\D/g, "").length} 位）`
      : "";

  if (closedLabel) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-medium text-foreground">{closedLabel}</p>
        <p className="mt-2 text-sm text-muted-foreground">此賽事已不再接受報名</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <StartTournamentLink />
          <Link
            href="/tournaments"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            查看其他賽事
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <svg
            className="h-8 w-8 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">報名成功！</h2>
        <p className="mt-3 text-muted-foreground">
          你已成功報名 <span className="font-medium text-foreground">{title}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(startsAt)} · {location}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          請於比賽當日到店，並帶同登記的手機號碼。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <StartTournamentLink />
          <Link
            href="/tournaments"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          >
            返回賽事列表
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!normalizePhone(phone)) {
      setError("電話號碼必須為 8 位數字");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/tournaments/${encodeURIComponent(slug)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, email, phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "報名失敗，請重試");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("網絡錯誤，請檢查連接後重試");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-lg font-semibold text-foreground">參賽者資料</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="player-name">
              姓名 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="player-name"
              required
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="你的中文或英文姓名"
              className="mt-1"
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="player-email">
              電郵 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="player-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="mt-1"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="player-phone">
              電話 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="player-phone"
              type="tel"
              required
              inputMode="numeric"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="9876 5432"
              className="mt-1"
              autoComplete="tel"
            />
            {phoneHint && <p className="mt-1 text-xs text-red-400">{phoneHint}</p>}
          </div>
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StartTournamentLink />
        <Button
          type="submit"
          disabled={pending}
          className="bg-white text-black hover:bg-white/90"
        >
          {pending ? "處理中..." : "確認報名"}
        </Button>
      </div>
    </form>
  );
}
