import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  prepareAccountAnalysis: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/analysis/enqueue", () => ({
  prepareAccountAnalysis: hoisted.prepareAccountAnalysis,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: hoisted.dbSelect,
  },
}));

import {
  buildWeeklyAnalysisOutgoingEvents,
  listWeeklyAnalysisSubAccountTargets,
} from "@/lib/analysis/weekly-analysis-fanout";

function mockSelectChain(rows: unknown) {
  return {
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  };
}

describe("weekly analysis fan-out", () => {
  beforeEach(() => {
    hoisted.prepareAccountAnalysis.mockReset();
    hoisted.dbSelect.mockReset();
  });

  it("listWeeklyAnalysisSubAccountTargets returns rows from the active subscription join", async () => {
    const rows = [
      { organizationId: "org-1", subAccountId: "sa-1" },
      { organizationId: "org-1", subAccountId: "sa-2" },
    ];
    hoisted.dbSelect.mockReturnValue(mockSelectChain(rows));

    const result = await listWeeklyAnalysisSubAccountTargets();

    expect(result).toEqual(rows);
    expect(hoisted.dbSelect).toHaveBeenCalledTimes(1);
  });

  it("returns no targets when the active-subscription join yields nothing (no row, or only canceled / inactive subscription)", async () => {
    hoisted.dbSelect.mockReturnValue(mockSelectChain([]));

    const result = await listWeeklyAnalysisSubAccountTargets();

    expect(result).toEqual([]);
  });

  it("buildWeeklyAnalysisOutgoingEvents emits one event per sub-account when prepare returns send", async () => {
    hoisted.prepareAccountAnalysis
      .mockResolvedValueOnce({
        outcome: "send",
        analysisId: "an-1",
        idempotencyId: "id-1",
        eventPayload: {
          analysisId: "an-1",
          organizationId: "org-1",
          subAccountId: "sa-1",
          triggeredBy: "scheduled",
          periodStart: "2026-04-07T00:00:00.000Z",
          periodEnd: "2026-04-14T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        outcome: "send",
        analysisId: "an-2",
        idempotencyId: "id-2",
        eventPayload: {
          analysisId: "an-2",
          organizationId: "org-1",
          subAccountId: "sa-2",
          triggeredBy: "scheduled",
          periodStart: "2026-04-07T00:00:00.000Z",
          periodEnd: "2026-04-14T00:00:00.000Z",
        },
      });

    const events = await buildWeeklyAnalysisOutgoingEvents([
      { organizationId: "org-1", subAccountId: "sa-1" },
      { organizationId: "org-1", subAccountId: "sa-2" },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]?.name).toBe("analysis/account.requested");
    expect(events[1]?.id).toBe("id-2");
    expect(hoisted.prepareAccountAnalysis).toHaveBeenCalledTimes(2);
  });

  it("buildWeeklyAnalysisOutgoingEvents skips sub-accounts when prepare blocks the plan", async () => {
    hoisted.prepareAccountAnalysis
      .mockResolvedValueOnce({
        outcome: "blocked_plan",
        plan: { allowed: false, reason: "limit_reached" },
      })
      .mockResolvedValueOnce({
        outcome: "send",
        analysisId: "an-2",
        idempotencyId: "id-2",
        eventPayload: {
          analysisId: "an-2",
          organizationId: "org-1",
          subAccountId: "sa-2",
          triggeredBy: "scheduled",
          periodStart: "2026-04-07T00:00:00.000Z",
          periodEnd: "2026-04-14T00:00:00.000Z",
        },
      });

    const events = await buildWeeklyAnalysisOutgoingEvents([
      { organizationId: "org-1", subAccountId: "sa-1" },
      { organizationId: "org-1", subAccountId: "sa-2" },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.data.subAccountId).toBe("sa-2");
  });
});
