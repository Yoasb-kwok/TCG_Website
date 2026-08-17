import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.role = user.role;
        // ADR-008 Decision 4：登入時帶入電郵變更待驗證旗標（由 authorize 計算）
        token.emailChangePending = user.emailChangePending === true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN";
        session.user.emailChangePending = token.emailChangePending === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
