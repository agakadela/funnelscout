import { describe, expect, it } from "vitest";
import { buildPipelineMetricsSnapshot } from "@/lib/analysis/metrics";

describe("buildPipelineMetricsSnapshot", () => {
  const periodStart = new Date("2026-03-30T00:00:00.000Z");
  const periodEnd = new Date("2026-04-06T00:00:00.000Z");

  it("aggregates counts, unique opportunities, and monetary sum", () => {
    const snap = buildPipelineMetricsSnapshot({
      periodStart,
      periodEnd,
      subAccountId: "sub-a",
      rows: [
        {
          eventType: "OpportunityCreate",
          ghlPipelineStageId: "s1",
          status: "open",
          monetaryValue: "100.50",
          ghlOpportunityId: "o1",
          occurredAt: new Date("2026-04-01T10:00:00.000Z"),
        },
        {
          eventType: "OpportunityStageUpdate",
          ghlPipelineStageId: "s2",
          status: "open",
          monetaryValue: "200",
          ghlOpportunityId: "o1",
          occurredAt: new Date("2026-04-02T10:00:00.000Z"),
        },
        {
          eventType: "OpportunityCreate",
          ghlPipelineStageId: "s1",
          status: null,
          monetaryValue: null,
          ghlOpportunityId: "o2",
          occurredAt: new Date("2026-04-03T10:00:00.000Z"),
        },
      ],
    });

    expect(snap.subAccountId).toBe("sub-a");
    expect(snap.eventCount).toBe(3);
    expect(snap.uniqueOpportunityCount).toBe(2);
    expect(snap.eventsByType.OpportunityCreate).toBe(2);
    expect(snap.eventsByType.OpportunityStageUpdate).toBe(1);
    expect(snap.eventsByStageId.s1).toBe(2);
    expect(snap.eventsByStageId.s2).toBe(1);
    expect(snap.statusCounts.open).toBe(2);
    expect(snap.statusCounts.unknown).toBe(1);
    expect(snap.sumMonetaryValue).toBeCloseTo(300.5, 5);
  });

  it("returns zeros for an empty row set", () => {
    const snap = buildPipelineMetricsSnapshot({
      periodStart,
      periodEnd,
      subAccountId: "sub-b",
      rows: [],
    });
    expect(snap.eventCount).toBe(0);
    expect(snap.uniqueOpportunityCount).toBe(0);
    expect(snap.sumMonetaryValue).toBe(0);
    expect(Object.keys(snap.eventsByType)).toHaveLength(0);
  });
});
