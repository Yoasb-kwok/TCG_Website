"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORM_FIELD_INPUT_CLASS } from "@/lib/search-bar-styles";
import { SITE_BRAND } from "@/lib/constants";

const COUNTDOWN_SECONDS = 300; // 5 minutes

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = (await res.json()) as { error?: string; message?: string };

    if (!res.ok) {
      setError(data.error ?? "重設密碼失敗");
      setLoading(false);
      return;
    }

    router.push("/login?reset=success");
  };

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">連結無效</h2>
        <p className="text-sm text-muted-foreground">
          此重設連結無效，請重新申請密碼重設。
        </p>
        <Link
          href="/forgot-password"
          className="block text-sm text-pink-500 hover:text-pink-600"
        >
          重新申請 →
        </Link>
      </div>
    );
  }

  if (secondsLeft === 0) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">驗證已過期</h2>
        <p className="text-sm text-muted-foreground">
          驗證碼已超過 5 分鐘有效期，請重新申請密碼重設。
        </p>
        <Link
          href="/forgot-password"
          className="block text-sm text-pink-500 hover:text-pink-600"
        >
          重新申請 →
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleReset}
      className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6"
    >
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">設定新密碼</h2>
        <p className="mt-1 text-sm text-red-500">
          剩餘時間：{formatTime(secondsLeft)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">新密碼</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={FORM_FIELD_INPUT_CLASS}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">至少 6 個字元</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">確認密碼</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={FORM_FIELD_INPUT_CLASS}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            處理中...
          </>
        ) : (
          "重設密碼"
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">{SITE_BRAND}</h1>
        </div>
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-md text-center text-sm text-muted-foreground">
              載入中...
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
