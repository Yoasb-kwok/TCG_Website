import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs basic assertions", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolves path aliases", async () => {
    const mod = await import("@/lib/constants");
    expect(mod).toBeDefined();
  });
});
