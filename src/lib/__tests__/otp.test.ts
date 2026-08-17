import { describe, it, expect } from "vitest";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  isExpired,
  OTP_EXPIRY_MS,
  OTP_LENGTH,
} from "../otp";

describe("generateOtp", () => {
  it("returns a string of exactly 6 digits", () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
    expect(code.length).toBe(OTP_LENGTH);
  });

  it("generates different codes on successive calls (not deterministic)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateOtp());
    }
    // With 1,000,000 possible values, 100 codes should produce >90 unique
    expect(codes.size).toBeGreaterThan(90);
  });

  it("stays within 000000–999999 range", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtp();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });
});

describe("hashOtp + verifyOtp", () => {
  it("verifies a correct code against its hash", async () => {
    const code = "123456";
    const hash = await hashOtp(code);
    expect(hash).not.toBe(code);
    const valid = await verifyOtp(code, hash);
    expect(valid).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const hash = await hashOtp("123456");
    const valid = await verifyOtp("654321", hash);
    expect(valid).toBe(false);
  });

  it("rejects empty code", async () => {
    const hash = await hashOtp("123456");
    const valid = await verifyOtp("", hash);
    expect(valid).toBe(false);
  });
});

describe("isExpired", () => {
  it("returns false for a future date", () => {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    expect(isExpired(future)).toBe(false);
  });

  it("returns true for a past date", () => {
    const past = new Date(Date.now() - 1000);
    expect(isExpired(past)).toBe(true);
  });

  it("returns true for the current moment (edge case)", () => {
    const now = new Date(Date.now());
    expect(isExpired(now)).toBe(true);
  });
});

describe("constants", () => {
  it("OTP_EXPIRY_MS is 10 minutes", () => {
    expect(OTP_EXPIRY_MS).toBe(10 * 60 * 1000);
  });

  it("OTP_LENGTH is 6", () => {
    expect(OTP_LENGTH).toBe(6);
  });
});
