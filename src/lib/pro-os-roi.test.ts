import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateProOsRoi, formatHkd } from "./pro-os-roi";

describe("TCG-Pro OS ROI estimate", () => {
  it("matches the landing defaults of HK$120,000 and 8 events", () => {
    const result = estimateProOsRoi(120_000, 8);
    assert.equal(result.onlineSalesHkd, 42_000);
    assert.equal(result.hoursSaved, 68);
    assert.equal(formatHkd(120_000), "HK$ 120,000");
    assert.equal(formatHkd(42_000), "HK$ 42,000");
  });

  it("scales online sales at 35% and hours from revenue plus events", () => {
    const result = estimateProOsRoi(100_000, 2);
    assert.equal(result.onlineSalesHkd, 35_000);
    assert.equal(result.hoursSaved, 38);
  });

  it("clamps negative inputs to zero", () => {
    assert.deepEqual(estimateProOsRoi(-10, -2), { onlineSalesHkd: 0, hoursSaved: 0 });
  });
});
