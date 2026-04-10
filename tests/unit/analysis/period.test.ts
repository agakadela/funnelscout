import { describe, expect, it } from "vitest";
import {
  analysisIdempotencyId,
  getCompletedUtcWeekRange,
} from "@/lib/analysis/period";

describe("getCompletedUtcWeekRange", () => {
  it("returns the prior Monday–Monday UTC window for a Wednesday reference", () => {
    const ref = new Date(Date.UTC(2026, 3, 8, 12, 0, 0));
    const { periodStart, periodEnd } = getCompletedUtcWeekRange(ref);
    expect(periodStart.toISOString()).toBe("2026-03-30T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2026-04-06T00:00:00.000Z");
  });

  it("returns the prior week when reference is Monday 17:00 UTC", () => {
    const ref = new Date(Date.UTC(2026, 3, 6, 17, 0, 0));
    const { periodStart, periodEnd } = getCompletedUtcWeekRange(ref);
    expect(periodStart.toISOString()).toBe("2026-03-30T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2026-04-06T00:00:00.000Z");
  });
});

describe("analysisIdempotencyId", () => {
  it("embeds sub-account id and ISO period start", () => {
    const periodStart = new Date("2026-03-30T00:00:00.000Z");
    expect(analysisIdempotencyId("sub_1", periodStart)).toBe(
      "analysis-sub_1-2026-03-30T00:00:00.000Z",
    );
  });
});
