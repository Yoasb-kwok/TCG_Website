"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/otp-input";
import { SITE_BRAND } from "@/lib/constants";

const RESEND_SECONDS = 60;

export default function VerifyEmailChangePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const [otpAttempt, setOtpAttempt] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [noPending, setNoPending] = useState(false);
  const requestedOnce = useRef(false);

  const sendOtp = useCallback(async () => {
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const res = await fetch("/api/auth/email-change/request-otp", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error?.includes("沒有進行中的電郵變更")) {
          setNoPending(true);
        } else {
          setError(data.error ?? "發送驗證碼失敗");
        }
        return;
      }
      await res.json().catch(() => ({}));
      setResendIn(RESEND_SECONDS);
      setNotice("驗證碼已發送至您的新電郵");
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setSending(false);
    }
  }, []);

  // 自動請求 OTP（登入後落地本頁即觸發 State 2）
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !requestedOnce.current) {
      requestedOnce.current = true;
      void sendOtp();
    }
  }, [status, router, sendOtp]);

  // 重新發送倒數
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email-change/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "驗證失敗");
        setOtp("");
        setOtpAttempt((a) => a + 1);
        return;
      }
      // 清除 session 內的 emailChangePending 旗標（jwt trigger: update）
      await update();
      router.replace("/");
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setOtp("");
    setOtpAttempt((a) => a + 1);
    await sendOtp();
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{SITE_BRAND}</h1>
      </div>

      <form
        onSubmit={handleVerify}
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            驗證新電郵地址
          </h2>
          {noPending ? (
            <>
              <p className="text-sm text-muted-foreground">
                目前沒有進行中的電郵變更。
              </p>
              <p className="text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  ← 返回首頁
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                管理員已更新您的帳戶電郵至{" "}
                <strong className="text-foreground">
                  {session?.user?.email}
                </strong>
              </p>
              <p className="text-xs text-muted-foreground">
                請輸入發送至新電郵的 6 位數驗證碼（10 分鐘內有效）
              </p>
              <p className="text-xs text-amber-600">
                收不到？請檢查垃圾郵件匣
              </p>
            </>
          )}
        </div>

        {!noPending && (
          <>
            {sending ? (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在發送驗證碼...
              </div>
            ) : (
              <OtpInput key={otpAttempt} onChange={setOtp} disabled={loading} />
            )}

            {notice && (
              <p className="text-center text-sm text-green-600">{notice}</p>
            )}
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
                onClick={handleResend}
                disabled={loading || sending || resendIn > 0}
                className="text-pink-500 hover:text-pink-600 disabled:opacity-50"
              >
                {resendIn > 0 ? `重新發送（${resendIn}s）` : "重新發送"}
              </button>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/login" })}
                className="text-muted-foreground hover:text-foreground"
              >
                登出
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
