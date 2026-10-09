"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { liveBoardHref } from "@/lib/tournament-board";

function StartTournamentLink({ slug, title }: { slug: string; title: string }) {
  return (
    <Link
      href={liveBoardHref({ slug, title })}
      className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
    >
      開始店賽
    </Link>
  );
}

export function RegistrationForm({
  slug,
  title,
  open,
  spotsLeft,
}: {
  slug: string;
  title: string;
  open: boolean;
  spotsLeft: number;
}) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open || spotsLeft <= 0) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <StartTournamentLink slug={slug} title={title} />
        <p className="text-sm text-muted-foreground">
          {spotsLeft <= 0 ? "名額已滿" : "報名已截止"}
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <StartTournamentLink slug={slug} title={title} />
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
          已收到報名。請於比賽當日到店，並帶同登記的手機號碼。
        </p>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch(`/api/tournaments/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "報名失敗");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("報名失敗，請再試一次");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 max-w-md space-y-4">
      <div>
        <Label htmlFor="player-name">名字</Label>
        <Input
          id="player-name"
          required
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="參賽名字"
          className="mt-1"
          autoComplete="name"
        />
      </div>
      <div>
        <Label htmlFor="player-phone">手機號碼</Label>
        <Input
          id="player-phone"
          required
          inputMode="numeric"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="8 位香港手機號碼"
          className="mt-1"
          autoComplete="tel"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <StartTournamentLink slug={slug} title={title} />
        <Button
          type="submit"
          disabled={pending}
          className="bg-white text-black hover:bg-white/90"
        >
          {pending ? "提交中…" : "立即報名"}
        </Button>
      </div>
    </form>
  );
}
