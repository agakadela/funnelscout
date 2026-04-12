import { describe, expect, it } from "vitest";

import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import {
  healthScoreFromPipelineSnapshot,
  healthTier,
  stalledDealCount,
} from "@/lib/dashboard/health-score";

function snapshot(
  overrides: Partial<PipelineMetricsSnapshot> = {},
): PipelineMetricsSnapshot {
  return {
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
    subAccountId: "sub_1",
    eventCount: 10,
    uniqueOpportunityCount: 5,
    eventsByType: {},
    eventsByStageId: {},
    statusCounts: {},
    sumMonetaryValue: 0,
    ...overrides,
  };
}

describe("healthScoreFromPipelineSnapshot", () => {
  it("returns a bounded score for a balanced snapshot", () => {
    const s = snapshot({
      uniqueOpportunityCount: 20,
      statusCounts: { won: 8, lost: 2, open: 10 },
    });
    const score = healthScoreFromPipelineSnapshot(s);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("maps to green tier when score is high", () => {
    expect(healthTier(85)).toBe("green");
  });

  it("maps to yellow tier in the middle band", () => {
    expect(healthTier(55)).toBe("yellow");
  });

  it("maps to red tier when score is low", () => {
    expect(healthTier(22)).toBe("red");
  });
});

describe("stalledDealCount", () => {
  it("reads stalled from statusCounts when present", () => {
    const s = snapshot({ statusCounts: { stalled: 3 } });
    expect(stalledDealCount(s)).toBe(3);
  });

  it("returns zero when stalled is absent", () => {
    const s = snapshot({ statusCounts: { open: 2 } });
    expect(stalledDealCount(s)).toBe(0);
  });
});
