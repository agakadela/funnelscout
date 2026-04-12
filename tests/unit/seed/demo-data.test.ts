import { describe, expect, it } from "vitest";

import { AnalysisReportSchema } from "@/lib/ai/types";
import {
  buildPipelineMetricsSnapshot,
  isPipelineMetricsSnapshot,
} from "@/lib/analysis/metrics";
import {
  SEED_ANALYSIS_PERIOD_END_UTC,
  SEED_ANALYSIS_PERIOD_START_UTC,
  SEED_HISTORY_END_UTC,
  SEED_HISTORY_START_UTC,
  SEED_SUB_ACCOUNTS_PER_ORG,
  buildSeedDemoAnalysisReportJson,
  buildSeedLogicalOpportunityEventsForSubAccount,
  createMulberry32,
  filterMetricRowsForPeriod,
  logicalEventsToMetricRows,
  seedRngForSubAccount,
} from "@/lib/seed/demo-data";

describe("lib/seed/demo-data", () => {
  it("buildSeedDemoAnalysisReportJson matches AnalysisReportSchema", () => {
    const report = buildSeedDemoAnalysisReportJson();
    expect(() => AnalysisReportSchema.parse(report)).not.toThrow();
  });

  it("produces ~90 days of varied opportunity events per sub-account", () => {
    const ev = buildSeedLogicalOpportunityEventsForSubAccount({
      orgIndex: 0,
      subIndex: 0,
      windowStart: SEED_HISTORY_START_UTC,
      windowEnd: SEED_HISTORY_END_UTC,
    });
    expect(ev.length).toBeGreaterThan(120);
    for (const row of ev) {
      expect(row.occurredAt.getTime()).toBeGreaterThanOrEqual(
        SEED_HISTORY_START_UTC.getTime(),
      );
      expect(row.occurredAt.getTime()).toBeLessThan(
        SEED_HISTORY_END_UTC.getTime(),
      );
      expect(row.ghlEventId.length).toBeGreaterThan(10);
    }
  });

  it("is deterministic for the same org/sub indices", () => {
    const a = buildSeedLogicalOpportunityEventsForSubAccount({
      orgIndex: 1,
      subIndex: 2,
      windowStart: SEED_HISTORY_START_UTC,
      windowEnd: SEED_HISTORY_END_UTC,
    });
    const b = buildSeedLogicalOpportunityEventsForSubAccount({
      orgIndex: 1,
      subIndex: 2,
      windowStart: SEED_HISTORY_START_UTC,
      windowEnd: SEED_HISTORY_END_UTC,
    });
    expect(a.map((x) => x.ghlEventId)).toEqual(b.map((x) => x.ghlEventId));
  });

  it("builds a valid pipeline metrics snapshot for the seed analysis window", () => {
    const logical = buildSeedLogicalOpportunityEventsForSubAccount({
      orgIndex: 2,
      subIndex: 1,
      windowStart: SEED_HISTORY_START_UTC,
      windowEnd: SEED_HISTORY_END_UTC,
    });
    const rows = filterMetricRowsForPeriod(
      logicalEventsToMetricRows(logical),
      SEED_ANALYSIS_PERIOD_START_UTC,
      SEED_ANALYSIS_PERIOD_END_UTC,
    );
    expect(rows.length).toBeGreaterThan(0);
    const snapshot = buildPipelineMetricsSnapshot({
      periodStart: SEED_ANALYSIS_PERIOD_START_UTC,
      periodEnd: SEED_ANALYSIS_PERIOD_END_UTC,
      subAccountId: "seed_sub_account_placeholder",
      rows,
    });
    expect(isPipelineMetricsSnapshot(snapshot)).toBe(true);
  });

  it("declares 3, 4, and 5 sub-accounts per seed org", () => {
    expect(SEED_SUB_ACCOUNTS_PER_ORG).toEqual([3, 4, 5]);
    expect(SEED_SUB_ACCOUNTS_PER_ORG.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it("mulberry32 RNG stays in [0, 1)", () => {
    const rng = createMulberry32(12345);
    for (let i = 0; i < 50; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("seedRngForSubAccount differs across sub-indices", () => {
    const a = seedRngForSubAccount(0, 0);
    const b = seedRngForSubAccount(0, 1);
    const sampleA = [a(), a(), a(), a(), a()];
    const sampleB = [b(), b(), b(), b(), b()];
    expect(sampleA).not.toEqual(sampleB);
  });
});
