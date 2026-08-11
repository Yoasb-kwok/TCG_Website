import { describe, it, expect, beforeEach, vi } from "vitest";

describe("checkCooldown", () => {
  beforeEach(() => {
    // Reset internal state between tests
    // The module uses an in-memory Map, so we re-import to reset
    vi.resetModules();
  });

  it("allows first request", async () => {
    const { checkCooldown } = await import("../rate-limit");
    const result = checkCooldown("test@example.com", { cooldownMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("blocks second request within cooldown window", async () => {
    const { checkCooldown } = await import("../rate-limit");
    checkCooldown("test@example.com", { cooldownMs: 60_000 });
    const result = checkCooldown("test@example.com", { cooldownMs: 60_000 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("uses separate cooldown per key", async () => {
    const { checkCooldown } = await import("../rate-limit");
    checkCooldown("a@example.com", { cooldownMs: 60_000 });
    const result = checkCooldown("b@example.com", { cooldownMs: 60_000 });
    expect(result.allowed).toBe(true);
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows requests under the max", async () => {
    const { checkRateLimit } = await import("../rate-limit");
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("192.168.1.1", { max: 5, windowMs: 600_000 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks 6th request when max is 5", async () => {
    const { checkRateLimit } = await import("../rate-limit");
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.2", { max: 5, windowMs: 600_000 });
    }
    const result = checkRateLimit("192.168.1.2", { max: 5, windowMs: 600_000 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    const { checkRateLimit } = await import("../rate-limit");
    for (let i = 0; i < 5; i++) {
      checkRateLimit("1.1.1.1", { max: 5, windowMs: 600_000 });
    }
    const result = checkRateLimit("2.2.2.2", { max: 5, windowMs: 600_000 });
    expect(result.allowed).toBe(true);
  });

  it("resets after the time window passes", async () => {
    vi.resetModules();
    const { checkRateLimit } = await import("../rate-limit");

    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit("3.3.3.3", { max: 5, windowMs: 100 });
    }
    const blocked = checkRateLimit("3.3.3.3", { max: 5, windowMs: 100 });
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 150));

    const after = checkRateLimit("3.3.3.3", { max: 5, windowMs: 100 });
    expect(after.allowed).toBe(true);
  });
});
