"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="hidden h-8 w-16 animate-pulse rounded-md bg-muted md:inline-block" />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="hidden items-center gap-1 hover:text-foreground md:flex"
      >
        <User className="h-4 w-4" />
        登入 / 註冊
      </Link>
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  const label = session.user.name ?? session.user.email ?? "帳戶";

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="max-w-[8rem] truncate text-sm text-muted-foreground" title={label}>
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
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">登出</span>
      </Button>
    </div>
  );
}
