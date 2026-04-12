import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  listTargets: vi.fn(),
  buildEvents: vi.fn(),
  sendEvent: vi.fn(),
}));

vi.mock("@/lib/analysis/weekly-analysis-fanout", () => ({
  listWeeklyAnalysisSubAccountTargets: hoisted.listTargets,
  buildWeeklyAnalysisOutgoingEvents: hoisted.buildEvents,
}));

import { runWeeklyAnalysisJob } from "@/inngest/functions/weeklyAnalysis";

describe("weeklyAnalysis (Inngest)", () => {
  beforeEach(() => {
    hoisted.listTargets.mockReset();
    hoisted.buildEvents.mockReset();
    hoisted.sendEvent.mockReset();
  });

  it("sends one analysis request event per prepared sub-account", async () => {
    hoisted.listTargets.mockResolvedValue([
      { organizationId: "org-a", subAccountId: "sub-1" },
      { organizationId: "org-b", subAccountId: "sub-2" },
    ]);
    const outgoing = [
      {
        id: "idem-1",
        name: "analysis/account.requested" as const,
        data: {
          analysisId: "a1",
          organizationId: "org-a",
          subAccountId: "sub-1",
          triggeredBy: "scheduled" as const,
          periodStart: "2026-04-07T00:00:00.000Z",
          periodEnd: "2026-04-14T00:00:00.000Z",
        },
      },
      {
        id: "idem-2",
        name: "analysis/account.requested" as const,
        data: {
          analysisId: "a2",
          organizationId: "org-b",
          subAccountId: "sub-2",
          triggeredBy: "scheduled" as const,
          periodStart: "2026-04-07T00:00:00.000Z",
          periodEnd: "2026-04-14T00:00:00.000Z",
        },
      },
    ];
    hoisted.buildEvents.mockResolvedValue(outgoing);

    const result = await runWeeklyAnalysisJob({
      run: async (id: string, fn: () => unknown) => {
        if (id === "list-active-sub-accounts") {
          return fn();
        }
        if (id === "prepare-analysis-jobs") {
          return fn();
        }
        throw new Error(`unexpected step.run id: ${id}`);
      },
      sendEvent: hoisted.sendEvent,
    });

    expect(result).toEqual({ ok: true, sent: 2 });
    expect(hoisted.buildEvents).toHaveBeenCalledWith([
      { organizationId: "org-a", subAccountId: "sub-1" },
      { organizationId: "org-b", subAccountId: "sub-2" },
    ]);
    expect(hoisted.sendEvent).toHaveBeenCalledTimes(1);
    expect(hoisted.sendEvent).toHaveBeenCalledWith(
      "emit-account-analysis-requests",
      outgoing,
    );
  });

  it("returns sent: 0 and does not call sendEvent when there is nothing to enqueue", async () => {
    hoisted.listTargets.mockResolvedValue([]);
    hoisted.buildEvents.mockResolvedValue([]);

    const result = await runWeeklyAnalysisJob({
      run: async (id: string, fn: () => unknown) => {
        if (id === "list-active-sub-accounts") {
          return fn();
        }
        if (id === "prepare-analysis-jobs") {
          return fn();
        }
        throw new Error(`unexpected step.run id: ${id}`);
      },
      sendEvent: hoisted.sendEvent,
    });

    expect(result).toEqual({ ok: true, sent: 0 });
    expect(hoisted.sendEvent).not.toHaveBeenCalled();
  });
});
