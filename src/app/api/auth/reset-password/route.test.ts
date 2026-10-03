import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
}));

vi.mock("@/lib/otp", () => ({
  verifyOtp: vi.fn().mockResolvedValue(true),
  isExpired: vi.fn((d: Date) => Date.now() >= d.getTime()),
  generateOtp: vi.fn(() => "123456"),
  hashOtp: vi.fn().mockResolvedValue("hashed"),
  OTP_EXPIRY_MS: 600000,
  OTP_MAX_ATTEMPTS: 5,
  OTP_LENGTH: 6,
}));

// Mock jose — we test our logic, not JWT library internals
vi.mock("jose", () => ({
  SignJWT: class {
    private payload: Record<string, unknown> = {};
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    sign() {
      return Promise.resolve("mock-jwt-token");
    }
  },
  jwtVerify: vi.fn(),
}));

import { POST as verifyOtpPOST } from "@/app/api/auth/verify-reset-otp/route";
import { POST as resetPasswordPOST } from "@/app/api/auth/reset-password/route";
import { getPrisma } from "@/lib/prisma";

// Both route files read process.env.AUTH_SECRET at runtime via getJwtSecret().
// Set it here so the routes don't throw during tests.
process.env.AUTH_SECRET = "test-auth-secret-at-least-32-bytes!";

function makeRequest(
  url: string,
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeResetToken(email: string): string {
  // Since jose is mocked, we just return a token string.
  // The jwtVerify mock controls valid/expired behavior per test.
  return `mock-token-${email}`;
}

const validResetRow = {
  id: "row-1",
  email: "user@example.com",
  code: "$2a$10$hashed",
  attempts: 0,
  used: false,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  createdAt: new Date(),
};

// ── verify-reset-otp ─────────────────────────────────────────────

describe("POST /api/auth/verify-reset-otp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when missing email or code", async () => {
    const res = await verifyOtpPOST(makeRequest("/api/auth/verify-reset-otp", {}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no reset row exists", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never);

    const res = await verifyOtpPOST(
      makeRequest("/api/auth/verify-reset-otp", {
        email: "unknown@example.com",
        code: "123456",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 410 when already used", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: {
        findUnique: vi.fn().mockResolvedValue({ ...validResetRow, used: true }),
      },
    } as never);

    const res = await verifyOtpPOST(
      makeRequest("/api/auth/verify-reset-otp", {
        email: "user@example.com",
        code: "123456",
      }),
    );
    expect(res.status).toBe(410);
  });

  it("returns 410 when expired", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: {
        findUnique: vi.fn().mockResolvedValue({
          ...validResetRow,
          expiresAt: new Date(Date.now() - 1000),
        }),
        delete: vi.fn(),
      },
    } as never);

    const res = await verifyOtpPOST(
      makeRequest("/api/auth/verify-reset-otp", {
        email: "user@example.com",
        code: "123456",
      }),
    );
    expect(res.status).toBe(410);
  });

  it("returns token on correct code", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: {
        findUnique: vi.fn().mockResolvedValue(validResetRow),
        update: vi.fn(),
      },
    } as never);

    // verifyOtp is mocked to return true at module level

    const res = await verifyOtpPOST(
      makeRequest("/api/auth/verify-reset-otp", {
        email: "user@example.com",
        code: "123456",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.token).toBeDefined();
    expect(json.expiresIn).toBe(300);
  });
});

// ── reset-password ───────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when missing token or password", async () => {
    const res = await resetPasswordPOST(
      makeRequest("/api/auth/reset-password", { password: "123456" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password too short", async () => {
    const res = await resetPasswordPOST(
      makeRequest("/api/auth/reset-password", {
        token: "sometoken",
        password: "12345",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 with invalid token", async () => {
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid token"));

    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: { findUnique: vi.fn() },
      user: { update: vi.fn() },
    } as never);

    const res = await resetPasswordPOST(
      makeRequest("/api/auth/reset-password", {
        token: "invalid-token",
        password: "newpass123",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 with expired token", async () => {
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockRejectedValue(new Error("jwt expired"));

    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: { findUnique: vi.fn() },
      user: { update: vi.fn() },
    } as never);

    const expiredToken = makeResetToken("user@example.com");

    const res = await resetPasswordPOST(
      makeRequest("/api/auth/reset-password", {
        token: expiredToken,
        password: "newpass123",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("updates password and marks row as used with valid token", async () => {
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { email: "user@example.com", purpose: "password_reset" },
    } as never);

    const validToken = makeResetToken("user@example.com");
    const mockUserUpdate = vi.fn().mockResolvedValue({});
    const mockResetUpdate = vi.fn().mockResolvedValue({});

    vi.mocked(getPrisma).mockReturnValue({
      passwordReset: {
        findUnique: vi.fn().mockResolvedValue({ ...validResetRow, used: false }),
        update: mockResetUpdate,
      },
      user: { update: mockUserUpdate },
    } as never);

    const res = await resetPasswordPOST(
      makeRequest("/api/auth/reset-password", {
        token: validToken,
        password: "newpass123",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledOnce();
    expect(mockResetUpdate).toHaveBeenCalledOnce();
    expect(json.message).toContain("密碼已重設");
  });
});
