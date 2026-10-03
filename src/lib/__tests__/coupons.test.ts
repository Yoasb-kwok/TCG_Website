import { describe, it, expect } from "vitest";
import { generateCouponCode } from "@/lib/coupons";

describe("generateCouponCode", () => {
  it("converts 'Summer Sale' → 'summer-sale'", () => {
    expect(generateCouponCode("Summer Sale")).toBe("summer-sale");
  });

  it("strips special characters from '夏季 20% Off!' → '20-off'", () => {
    expect(generateCouponCode("夏季 20% Off!")).toBe("20-off");
  });

  it("handles empty string → empty string", () => {
    expect(generateCouponCode("")).toBe("");
  });

  it("handles underscores as hyphens", () => {
    expect(generateCouponCode("Black_Friday")).toBe("black-friday");
  });

  it("collapses multiple hyphens", () => {
    expect(generateCouponCode("A   B")).toBe("a-b");
  });
});
