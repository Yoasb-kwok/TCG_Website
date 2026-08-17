import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/points", () => ({ getPointsBalance: vi.fn() }));

import { GET } from "./route";
import { auth } from "@/auth";
import { getPointsBalance } from "@/lib/points";
import { isDatabaseConfigured } from "@/lib/prisma";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/user/points", () => {
  it("returns { points: N } for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", email: "alice@test.com", role: "USER" },
    } as never);
    vi.mocked(getPointsBalance).mockResolvedValue(150);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ points: 150 });
    expect(getPointsBalance).toHaveBeenCalledWith("alice@test.com");
  });

  it("returns 401 for unauthenticated request", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 if session has no email", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER" },
    } as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 0 when database is not configured", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", email: "alice@test.com", role: "USER" },
    } as never);
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ points: 0 });
  });
});
