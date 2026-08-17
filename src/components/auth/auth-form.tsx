"use client";

import { useEffect, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORM_FIELD_INPUT_CLASS } from "@/lib/search-bar-styles";
import { SITE_BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { OtpInput } from "@/components/auth/otp-input";

type Tab = "login" | "register";
type Step = "credentials" | "otp";

function resolveRedirect(
  role: "USER" | "ADMIN",
  callbackUrl: string | null,
): string {
  if (role === "ADMIN") {
    if (callbackUrl?.startsWith("/admin")) return callbackUrl;
    return "/admin";
  }
  if (callbackUrl && !callbackUrl.startsWith("/admin")) return callbackUrl;
  return "/";
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [otp, setOtp] = useState("");
  const [otpAttempt, setOtpAttempt] = useState(0);

  const callbackUrl = searchParams.get("callbackUrl");
  const urlError = searchParams.get("error");

  useEffect(() => {
    if (urlError === "forbidden") {
      setError("此帳戶無權進入商家後台");
    }
  }, [urlError]);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.role) {
        router.replace(resolveRedirect(session.user.role, callbackUrl));
      }
    });
  }, [router, callbackUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("電郵或密碼錯誤");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role ?? "USER";
    router.push(resolveRedirect(role, callbackUrl));
    router.refresh();
  };

  // ── Registration OTP flow ──────────────────────────────────────

  async function sendRegistrationOtp(): Promise<boolean> {
    setError(null);

    const res = await fetch("/api/auth/send-registration-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "發送驗證碼失敗");
      return false;
    }

    return true;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await sendRegistrationOtp();
    if (success) {
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/verify-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: otp }),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "驗證失敗");
      setLoading(false);
      return;
    }

    // Auto-login — account was just created by the verify endpoint
    const signInResult = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError("註冊成功，請改用登入");
      setTab("login");
      setStep("credentials");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role ?? "USER";
    router.push(resolveRedirect(role, callbackUrl));
    router.refresh();
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setOtp("");
    setOtpAttempt((a) => a + 1);
    await sendRegistrationOtp();
    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{SITE_BRAND}</h1>
      </div>

      <div className="mt-6 flex rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setStep("credentials");
            setError(null);
          }}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition",
            tab === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setStep("credentials");
            setError(null);
          }}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition",
            tab === "register"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          註冊
        </button>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-pink-500/20 bg-pink-500/5 px-3 py-2.5 text-xs text-muted-foreground">
        <Store className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" />
        <p>
          店家管理員使用已授權帳戶登入後，將<strong className="text-foreground">自動進入商家後台</strong>
          管理商品與訂單。
        </p>
      </div>

      {tab === "register" && step === "otp" ? (
        <form
          onSubmit={handleVerifyOtp}
          className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="space-y-1 text-center">
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
                setStep("credentials");
                setError(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              返回修改
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={tab === "login" ? handleLogin : handleRegister}
          className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
        >
          {tab === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">名稱（選填）</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FORM_FIELD_INPUT_CLASS}
                autoComplete="name"
              />
            </div>
          )}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">密碼</Label>
              {tab === "login" && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-pink-500 hover:text-pink-600"
                >
                  忘記密碼？
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FORM_FIELD_INPUT_CLASS}
              required
              minLength={6}
              autoComplete={
                tab === "login" ? "current-password" : "new-password"
              }
            />
            {tab === "register" && (
              <p className="text-xs text-muted-foreground">至少 6 個字元</p>
            )}
          </div>

          {tab === "register" && (
            <div className="space-y-2">
              <Label htmlFor="phone">電話（選填）</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={FORM_FIELD_INPUT_CLASS}
                autoComplete="tel"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                處理中...
              </>
            ) : tab === "login" ? (
              "登入"
            ) : (
              "發送驗證碼"
            )}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← 返回首頁
        </Link>
      </p>
    </div>
  );
}
