"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu({ tone = "default" }: { tone?: "default" | "onDark" }) {
  const { data: session, status } = useSession();
  const onDark = tone === "onDark";

  if (status === "loading") {
    return (
      <span
        className={
          onDark
            ? "hidden h-8 w-16 animate-pulse rounded-md bg-white/10 xl:inline-block"
            : "hidden h-8 w-16 animate-pulse rounded-md bg-muted md:inline-block"
        }
      />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className={
          onDark
            ? "hidden text-[13px] leading-[1.6] whitespace-nowrap text-white transition hover:text-[#c8a24a] xl:inline"
            : "hidden items-center gap-1 hover:text-foreground md:flex"
        }
      >
        {onDark ? null : <User className="h-4 w-4" />}
        登入 / 註冊
      </Link>
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  const label = session.user.name ?? session.user.email ?? "帳戶";

  return (
    <div className={onDark ? "hidden items-center gap-2 xl:flex" : "hidden items-center gap-2 md:flex"}>
      <span
        className={onDark ? "max-w-[8rem] truncate text-[13px] text-white" : "max-w-[8rem] truncate text-sm text-muted-foreground"}
        title={label}
      >
        {label}
      </span>
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-1 rounded-md border border-pink-500/30 bg-pink-500/10 px-2 py-1 text-xs font-medium text-pink-400 hover:bg-pink-500/20"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          後台
        </Link>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={onDark ? "h-8 px-2 text-white hover:bg-white/10 hover:text-white" : "h-8 px-2 text-muted-foreground hover:text-foreground"}
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">登出</span>
      </Button>
    </div>
  );
}
