import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: vi.fn(() => true),
  getPrisma: vi.fn(),
}));

vi.mock("@/lib/accounts", () => ({
  issueEmailChangeOtp: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkCooldown: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));

import { auth } from "@/auth";
import { issueEmailChangeOtp } from "@/lib/accounts";
import { sendOtpEmail } from "@/lib/email";
import { checkCooldown } from "@/lib/rate-limit";
import { POST } from "./route";

function makeRequest() {
  return new NextRequest("http://localhost/api/auth/email-change/request-otp", {
    method: "POST",
  });
}

function mockSession(userId?: string) {
  vi.mocked(auth).mockResolvedValue(
    (userId
      ? { user: { id: userId, email: "new@test.com", name: "Alice" } }
      : null) as never,
  );
}

describe("POST /api/auth/email-change/request-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkCooldown).mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it("returns 401 without a session", async () => {
    mockSession();
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("sends OTP to the new email with email-change purpose", async () => {
    mockSession("user-1");
    vi.mocked(issueEmailChangeOtp).mockResolvedValue({
      code: "123456",
      newEmail: "new@test.com",
    });
    vi.mocked(sendOtpEmail).mockResolvedValue(true);

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(issueEmailChangeOtp).toHaveBeenCalledWith("user-1");
    expect(sendOtpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@test.com",
        code: "123456",
        purpose: "email-change",
      }),
    );
    expect(data.newEmail).toBe("new@test.com");
  });

  it("returns 400 when no pending email change exists", async () => {
    mockSession("user-2");
    vi.mocked(issueEmailChangeOtp).mockRejectedValue(
      new Error("沒有進行中的電郵變更"),
    );

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("沒有進行中的電郵變更");
  });

  it("returns 502 when the email fails to send", async () => {
    mockSession("user-3");
    vi.mocked(issueEmailChangeOtp).mockResolvedValue({
      code: "654321",
      newEmail: "new@test.com",
    });
    vi.mocked(sendOtpEmail).mockResolvedValue(false);

    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
  });

  it("returns 429 during cooldown", async () => {
    mockSession("user-4");
    vi.mocked(checkCooldown).mockReturnValue({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain("30");
  });
});
