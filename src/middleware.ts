import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

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
  matcher: ["/admin/:path*"],
};
