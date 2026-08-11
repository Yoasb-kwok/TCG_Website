import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// We'll mock the Prisma client and email sender
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkCooldown: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
}));

import { POST } from "./route";
import { getPrisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { checkCooldown, checkRateLimit } from "@/lib/rate-limit";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/send-registration-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/send-registration-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkCooldown).mockReturnValue({ allowed: true, retryAfterMs: 0 });
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it("returns 400 when email is missing", async () => {
    const req = makeRequest({ password: "123456" });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("電郵");
  });

  it("returns 400 when password is missing", async () => {
    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const req = makeRequest({ email: "not-an-email", password: "123456" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 when email is already registered", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "existing-user" }),
      },
      emailVerification: {
        upsert: vi.fn(),
      },
    } as never);

    const req = makeRequest({
      email: "taken@example.com",
      password: "123456",
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 429 when per-email cooldown is active", async () => {
    vi.mocked(checkCooldown).mockReturnValue({
      allowed: false,
      retryAfterMs: 45_000,
    });

    const req = makeRequest({
      email: "test@example.com",
      password: "123456",
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 429 when per-IP rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfterMs: 120_000,
    });

    const req = makeRequest({
      email: "test@example.com",
      password: "123456",
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("creates EmailVerification row and sends email on success", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    vi.mocked(getPrisma).mockReturnValue({
      user: { findUnique: mockFindUnique },
      emailVerification: { upsert: mockUpsert },
    } as never);

    const req = makeRequest({
      email: "newuser@example.com",
      password: "secret123",
      name: "Test User",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "newuser@example.com" },
    });
    expect(mockUpsert).toHaveBeenCalledOnce();
    expect(vi.mocked(sendOtpEmail)).toHaveBeenCalledOnce();
    expect(json.message).toBeDefined();
  });
});
