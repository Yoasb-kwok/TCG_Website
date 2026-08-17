import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // ── ADR-008 Decision 4：電郵變更待驗證 → 硬性 OTP 牆 ─────────────
  // 已登入且帶 emailChangePending 旗標的用戶：
  //   - 頁面請求 → 一律重定向至 /verify-email-change（頁面本身與 NextAuth 機制除外）
  //   - API 請求 → /api/auth/* 放行（登出、session 更新），其餘回 403
  if (req.auth?.user?.emailChangePending === true) {
    const isWallPage = pathname === "/verify-email-change";
    const isAuthMechanism = pathname.startsWith("/api/auth");

    if (!isWallPage && !isAuthMechanism) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "請先完成電郵驗證" },
          { status: 403 },
        );
      }
      const wall = new URL("/verify-email-change", req.nextUrl.origin);
      return NextResponse.redirect(wall);
    }
  }

  // ── Admin 守衛（原有邏輯） ─────────────────────────────────────────
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (req.auth.user.role !== "ADMIN") {
    const home = new URL("/", req.nextUrl.origin);
    home.searchParams.set("error", "forbidden");
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
