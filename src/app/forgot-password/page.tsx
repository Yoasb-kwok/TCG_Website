"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import { FORM_FIELD_INPUT_CLASS } from "@/lib/search-bar-styles";
import { SITE_BRAND } from "@/lib/constants";

type Step = "email" | "otp";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpAttempt, setOtpAttempt] = useState(0);

  async function sendResetOtp(): Promise<boolean> {
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "發送驗證碼失敗");
      return false;
    }
    return true;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await sendResetOtp();
    if (success) {
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/verify-reset-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: otp }),
    });

    const data = (await res.json()) as { token?: string; error?: string };

    if (!res.ok) {
      setError(data.error ?? "驗證失敗");
      setLoading(false);
      return;
    }

    router.push(`/reset-password?token=${data.token}`);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setOtp("");
    setOtpAttempt((a) => a + 1);
    await sendResetOtp();
    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{SITE_BRAND}</h1>
      </div>

      {step === "email" ? (
        <form
          onSubmit={handleSendOtp}
          className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">忘記密碼</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              輸入你的註冊電郵，我們會發送驗證碼給你
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">電郵</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FORM_FIELD_INPUT_CLASS}
              required
              autoComplete="email"
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
              "發送驗證碼"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              ← 返回登入
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={handleVerifyOtp}
          className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-semibold text-foreground">輸入驗證碼</h2>
            <p className="text-sm text-muted-foreground">
              驗證碼已發送至{" "}
              <strong className="text-foreground">{email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              請輸入 6 位數驗證碼（10 分鐘內有效）
            </p>
            <p className="text-xs text-amber-600">
              收不到？請檢查垃圾郵件匣
            </p>
          </div>

          <OtpInput key={otpAttempt} onChange={setOtp} disabled={loading} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                驗證中...
              </>
            ) : (
              "驗證"
            )}
          </Button>

          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-pink-500 hover:text-pink-600 disabled:opacity-50"
            >
              重新發送
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              返回修改
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
