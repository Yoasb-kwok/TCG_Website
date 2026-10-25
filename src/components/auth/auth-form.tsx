"use client";

import { useEffect, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORM_FIELD_INPUT_CLASS } from "@/lib/search-bar-styles";
import { SITE_BRAND } from "@/lib/constants";
import { parseMemberRegistration, type MemberField } from "@/lib/member-register";
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
  const [pokemonId, setPokemonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MemberField, string>>>({});
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

    const parsed = parseMemberRegistration({
      email,
      password,
      name,
      phone,
      pokemonId,
    });
    if (!parsed.ok) {
      setFieldErrors(parsed.fields);
      setError(parsed.error);
      setLoading(false);
      return;
    }
    setFieldErrors({});

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.value.email,
        password: parsed.value.password,
        name: parsed.value.name ?? undefined,
        phone: parsed.value.phone,
        pokemonId: parsed.value.pokemonId,
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

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-12 flex-1 items-center justify-center rounded-[10px] text-[14px] font-medium transition",
      active
        ? "border border-[#c8a24a] bg-[#080808] text-white"
        : "bg-[#e7f3c9] text-[#080808] hover:bg-[#dcebb6]",
    );

  return (
    <div className="mx-auto grid w-full max-w-[1060px] overflow-hidden rounded-[24px] bg-white shadow-[0_18px_42px_rgba(0,0,0,0.08)] lg:grid-cols-[480px_minmax(0,1fr)]">
      <div className="flex flex-col justify-center bg-[#e6dfff] px-8 py-12 sm:px-10">
        <p className="text-[64px] font-medium leading-none text-[#080808]">{SITE_BRAND}</p>
        <Image
          src="/brand/home/umbreon-vmax.png"
          alt=""
          width={310}
          height={380}
          unoptimized
          className="mt-8 h-auto w-full max-w-[310px] object-contain"
        />
      </div>

      <div className="flex flex-col gap-6 px-6 py-10 sm:px-12">
      <h1 className="text-[40px] font-medium leading-[1.3] text-[#0a0a09]">{SITE_BRAND}</h1>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setError(null);
            setFieldErrors({});
          }}
          className={tabClass(tab === "login")}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setError(null);
            setFieldErrors({});
          }}
          className={tabClass(tab === "register")}
        >
          註冊
        </button>
      </div>

      <p className="text-[13px] leading-[1.6] text-[#625f58]">
        店家管理員使用已授權帳戶登入後，將自動進入商家後台管理商品與訂單。
      </p>

      <form
        noValidate={tab === "register"}
        onSubmit={tab === "login" ? handleLogin : handleRegister}
        className="flex flex-col gap-4"
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
            <Label htmlFor="phone">
              電話 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876 5432"
              className={FORM_FIELD_INPUT_CLASS}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "phone-hint phone-error" : "phone-hint"}
              required
            />
            <p id="phone-hint" className="text-xs text-muted-foreground">
              8 位香港電話號碼
            </p>
            {fieldErrors.phone && (
              <p id="phone-error" className="text-xs text-red-500">
                {fieldErrors.phone}
              </p>
            )}
          </div>
        )}

        {tab === "register" && (
          <div className="space-y-2">
            <Label htmlFor="pokemon-id">
              Pokémon ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pokemon-id"
              value={pokemonId}
              onChange={(e) => setPokemonId(e.target.value)}
              placeholder="例如 1234-5678"
              maxLength={64}
              className={FORM_FIELD_INPUT_CLASS}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.pokemonId)}
              aria-describedby={
                fieldErrors.pokemonId ? "pokemon-id-hint pokemon-id-error" : "pokemon-id-hint"
              }
              required
            />
            <p id="pokemon-id-hint" className="text-xs text-muted-foreground">
              訓練家／玩家 ID
            </p>
            {fieldErrors.pokemonId && (
              <p id="pokemon-id-error" className="text-xs text-red-500">
                {fieldErrors.pokemonId}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          className="h-12 w-full rounded-[10px] border border-[#c8a24a] bg-[#080808] text-white hover:bg-[#1c1c1c]"
          disabled={loading}
        >
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

      <Link
        href="/"
        className="inline-flex h-12 w-fit items-center rounded-[10px] bg-[#e7f3c9] px-5 text-[14px] font-medium text-[#080808] transition hover:bg-[#dcebb6]"
      >
        ← 返回首頁
      </Link>
      </div>
    </div>
  );
}
