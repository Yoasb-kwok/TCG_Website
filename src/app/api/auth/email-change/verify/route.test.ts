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
  verifyEmailChangeOtp: vi.fn(),
}));

import { auth } from "@/auth";
import { verifyEmailChangeOtp } from "@/lib/accounts";
import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/email-change/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSession(userId?: string) {
  vi.mocked(auth).mockResolvedValue(
    (userId
      ? { user: { id: userId, email: "new@test.com", name: "Alice" } }
      : null) as never,
  );
}

describe("POST /api/auth/email-change/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session", async () => {
    mockSession();
    const res = await POST(makeRequest({ code: "123456" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-6-digit code", async () => {
    mockSession("user-1");
    const res = await POST(makeRequest({ code: "12ab" }));
    expect(res.status).toBe(400);
  });

  it("verifies the code for the session user", async () => {
    mockSession("user-1");
    vi.mocked(verifyEmailChangeOtp).mockResolvedValue({
      id: "user-1",
      email: "new@test.com",
    } as never);

    const res = await POST(makeRequest({ code: "123456" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(verifyEmailChangeOtp).toHaveBeenCalledWith("user-1", "123456");
    expect(data.email).toBe("new@test.com");
  });

  it("returns 400 with the domain error for a wrong code", async () => {
    mockSession("user-2");
    vi.mocked(verifyEmailChangeOtp).mockRejectedValue(
      new Error("驗證碼錯誤"),
    );

    const res = await POST(makeRequest({ code: "000000" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("驗證碼錯誤");
  });

  it("returns 429 when attempts are exhausted", async () => {
    mockSession("user-3");
    vi.mocked(verifyEmailChangeOtp).mockRejectedValue(
      new Error("嘗試次數過多，請聯絡管理員還原電郵變更"),
    );

    const res = await POST(makeRequest({ code: "000000" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when there is no pending change", async () => {
    mockSession("user-4");
    vi.mocked(verifyEmailChangeOtp).mockRejectedValue(
      new Error("沒有進行中的電郵變更"),
    );

    const res = await POST(makeRequest({ code: "111111" }));
    expect(res.status).toBe(400);
  });
});
