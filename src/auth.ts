import NextAuth from "next-auth";
import type { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/auth-password";
import { authConfig } from "@/auth.config";
import { getPrisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "電郵", type: "email" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const prisma = getPrisma();
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              passwordHash: true,
              deletedAt: true,
            },
          });
          if (!user?.passwordHash) return null;
          // ADR-008 Decision 7：軟刪除帳戶不可登入
          if (user.deletedAt) return null;

          const valid = await verifyPassword(password, user.passwordHash);
          if (!valid) return null;

          // ADR-008 Decision 4：登入時檢查是否有待驗證的電郵變更
          const pending = await prisma.emailChangeRequest.findUnique({
            where: { userId: user.id },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailChangePending: pending?.status === "PENDING",
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.role = user.role;
        // ADR-008 Decision 4：登入時帶入電郵變更待驗證旗標
        token.emailChangePending =
          (user as User).emailChangePending === true;
      }
      if (trigger === "update" && token.id) {
        // 驗證完成後 session.update() → 重新查詢待驗證狀態
        try {
          const prisma = getPrisma();
          const req = await prisma.emailChangeRequest.findUnique({
            where: { userId: token.id },
          });
          token.emailChangePending = req?.status === "PENDING";
        } catch {
          // DB 錯誤時保留現有旗標
        }
      }
      return token;
    },
  },
});
