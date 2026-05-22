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

type Tab = "login" | "register";

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
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
      setError(data.error ?? "註冊失敗");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError("註冊成功，請改用登入");
      setTab("login");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role ?? "USER";
    router.push(resolveRedirect(role, callbackUrl));
    router.refresh();
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
          <Label htmlFor="password">密碼</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FORM_FIELD_INPUT_CLASS}
            required
            minLength={6}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
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
            "註冊並登入"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← 返回首頁
        </Link>
      </p>
    </div>
  );
}
