import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      /** ADR-008 Decision 4：電郵變更待驗證 → 硬性 OTP 牆 */
      emailChangePending?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "ADMIN";
    emailChangePending?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    emailChangePending?: boolean;
  }
}
