import { encode } from "next-auth/jwt";
import dotenv from "dotenv";
import type { Page } from "@playwright/test";

// Load env vars from .env so AUTH_SECRET is available to the test runner
dotenv.config();

/**
 * Sets a valid NextAuth v5 session cookie on the browser context so that
 * the middleware (which checks `req.auth?.user` server-side) allows access
 * to /admin/* routes during E2E tests.
 *
 * The JWT payload includes `id` and `role` fields that the `jwt` and
 * `session` callbacks in `src/auth.config.ts` map onto `session.user`.
 */
export async function setAdminAuth(page: Page): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Make sure .env contains AUTH_SECRET.",
    );
  }

  const token = await encode({
    token: {
      name: "Admin",
      email: "admin@test.com",
      id: "admin-1",
      role: "ADMIN",
    },
    secret,
    // Salt must match the cookie name that NextAuth uses for session tokens
    salt: "authjs.session-token",
    maxAge: 30 * 24 * 60 * 60, // 30 days, matching default session maxAge
  });

  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
