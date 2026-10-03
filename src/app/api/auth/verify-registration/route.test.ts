import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
}));

vi.mock("@/lib/auth-password", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

import { POST } from "./route";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/verify-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validVerificationRow = {
  id: "row-1",
  email: "newuser@example.com",
  code: "$2a$10$hashedcode",
  passwordHash: "$2a$12$hashedpassword",
  name: "Test User",
  phone: null,
  attempts: 0,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  createdAt: new Date(),
};

describe("POST /api/auth/verify-registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ code: "123456" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is missing", async () => {
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfterMs: 60_000,
    });
    const res = await POST(
      makeRequest({ email: "test@example.com", code: "123456" }),
    );
    expect(res.status).toBe(429);
  });

  it("returns 404 when no verification row exists", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      emailVerification: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as never);

    const res = await POST(
      makeRequest({ email: "unknown@example.com", code: "123456" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 410 when code is expired", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      emailVerification: {
        findUnique: vi.fn().mockResolvedValue({
          ...validVerificationRow,
          expiresAt: new Date(Date.now() - 1000),
        }),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      },
    } as never);

    const res = await POST(
      makeRequest({ email: "newuser@example.com", code: "123456" }),
    );
    expect(res.status).toBe(410);
  });

  it("returns 403 when max attempts exceeded (5 wrong tries)", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      emailVerification: {
        findUnique: vi.fn().mockResolvedValue({
          ...validVerificationRow,
          attempts: 5,
        }),
        update: vi.fn(),
      },
    } as never);

    const res = await POST(
      makeRequest({ email: "newuser@example.com", code: "123456" }),
    );
    expect(res.status).toBe(403);
  });

  it("increments attempts and returns 400 on wrong code", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    vi.mocked(getPrisma).mockReturnValue({
      emailVerification: {
        findUnique: vi.fn().mockResolvedValue(validVerificationRow),
        update: mockUpdate,
      },
    } as never);

    // Mock verifyOtp to return false
    vi.spyOn(await import("@/lib/otp"), "verifyOtp").mockResolvedValue(false);

    const res = await POST(
      makeRequest({ email: "newuser@example.com", code: "000000" }),
    );
    expect(res.status).toBe(400);
    expect(mockUpdate).toHaveBeenCalled();
    // Verify attempts was incremented
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.attempts).toBeDefined();
  });

  it("creates user and deletes verification row on correct code", async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    const mockCreate = vi.fn().mockResolvedValue({
      id: "new-user-id",
      email: "newuser@example.com",
      name: "Test User",
      role: "USER",
    });
    const mockUpdate = vi.fn();

    vi.mocked(getPrisma).mockReturnValue({
      emailVerification: {
        findUnique: vi.fn().mockResolvedValue(validVerificationRow),
        update: mockUpdate,
        delete: mockDelete,
      },
      user: {
        create: mockCreate,
      },
    } as never);

    // Mock verifyOtp to return true
    vi.spyOn(await import("@/lib/otp"), "verifyOtp").mockResolvedValue(true);

    const res = await POST(
      makeRequest({ email: "newuser@example.com", code: "123456" }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(json.user).toBeDefined();
    expect(json.user.email).toBe("newuser@example.com");
  });
});
