import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(true),
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
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkCooldown).mockReturnValue({ allowed: true, retryAfterMs: 0 });
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-valid" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when per-email cooldown is active", async () => {
    vi.mocked(checkCooldown).mockReturnValue({
      allowed: false,
      retryAfterMs: 30_000,
    });
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 429 when per-IP rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfterMs: 60_000,
    });
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 200 but does NOT send email for unregistered email (no enumeration)", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    const mockUpsert = vi.fn();
    vi.mocked(getPrisma).mockReturnValue({
      user: { findUnique: mockFindUnique },
      passwordReset: { upsert: mockUpsert },
    } as never);

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBeDefined();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(vi.mocked(sendOtpEmail)).not.toHaveBeenCalled();
  });

  it("creates PasswordReset row and sends email for registered user", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({ id: "user-1" });
    const mockUpsert = vi.fn().mockResolvedValue({});
    vi.mocked(getPrisma).mockReturnValue({
      user: { findUnique: mockFindUnique },
      passwordReset: { upsert: mockUpsert, delete: vi.fn().mockResolvedValue({}) },
      emailChangeRequest: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never);

    const res = await POST(makeRequest({ email: "real@example.com" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledOnce();
    expect(vi.mocked(sendOtpEmail)).toHaveBeenCalledOnce();
    expect(json.message).toBeDefined();
  });
});
