"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

interface SessionResponse {
  paid?: boolean;
  error?: string;
  registration?: {
    id: string;
    playerName: string;
    email: string;
    tournament: {
      title: string;
      slug: string;
      startsAt: string;
      location: string;
    };
  };
}

export function TournamentRegisterSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SessionResponse | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/tournaments/register/session?session_id=${encodeURIComponent(sessionId)}`,
        );
        const json = (await res.json()) as SessionResponse;
        setData(json);
      } catch {
        setData({ error: "無法確認付款狀態" });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">確認付款中...</p>
      </div>
    );
  }

  if (!sessionId || data?.error || !data?.paid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-400" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">無法確認付款</h1>
        <p className="mt-2 text-muted-foreground">
          {data?.error ?? "缺少付款記錄。如已扣款，請聯絡門市並提供電郵。"}
        </p>
        <Link
          href="/tournaments"
          className={cn(buttonVariants(), "mt-8 inline-flex")}
        >
          返回賽事列表
        </Link>
      </div>
    );
  }

  const t = data.registration?.tournament;

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
      <h1 className="mt-6 text-2xl font-bold text-foreground">報名成功！</h1>
      <p className="mt-3 text-muted-foreground">
        {data.registration
          ? `${data.registration.playerName}，你已成功報名`
          : "你已成功報名"}
        {t ? ` ${t.title}` : ""}
      </p>
      {t && (
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(t.startsAt)} · {t.location}
        </p>
      )}

      {/* No-refund warning */}
      <div className="mt-8 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          報名一經確認，報名費概不退還（包括賽事取消或改期的情況）。
        </span>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/tournaments"
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
        >
          返回賽事列表
        </Link>
        <Link href="/" className={cn(buttonVariants(), "inline-flex")}>
          返回首頁
        </Link>
      </div>
    </div>
  );
}
