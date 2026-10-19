"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";
import { parseRegistrationInput } from "@/lib/registration-input";

export function DemoRegisterForm({ slug }: { slug: string }) {
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const parsed = parseRegistrationInput({ playerName, email, phone });
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/demo/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", slug, ...parsed.value }),
      });
      const data = (await res.json()) as { error?: string };
      setMessage(data.error || DEMO_WRITE_DISCLAIMER);
    } catch {
      setMessage(DEMO_WRITE_DISCLAIMER);
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="mt-6 max-w-md space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="demo-player">姓名</Label>
        <Input id="demo-player" value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-reg-email">電郵</Label>
        <Input
          id="demo-reg-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-phone">電話</Label>
        <Input
          id="demo-phone"
          inputMode="numeric"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="8 位香港號碼"
        />
      </div>
      {message && (
        <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "送出中…" : "提交報名"}
      </Button>
      <p className="text-xs text-muted-foreground">{DEMO_WRITE_DISCLAIMER}</p>
    </form>
  );
}
