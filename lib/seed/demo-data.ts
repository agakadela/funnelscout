import type { AnalysisReport } from "@/lib/ai/types";
import { AnalysisReportSchema } from "@/lib/ai/types";
import type { OpportunityEventMetricsRow } from "@/lib/analysis/metrics";

export const SEED_HISTORY_END_UTC = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));

export const SEED_HISTORY_START_UTC = new Date(
  SEED_HISTORY_END_UTC.getTime() - 90 * 86_400_000,
);

export const SEED_ANALYSIS_PERIOD_END_UTC = SEED_HISTORY_END_UTC;

export const SEED_ANALYSIS_PERIOD_START_UTC = new Date(
  SEED_ANALYSIS_PERIOD_END_UTC.getTime() - 7 * 86_400_000,
);

export const SEED_SUB_ACCOUNTS_PER_ORG = [3, 4, 5] as const;

/** One entry per seed agency (`orgIndex` 0..2). Matches `organizations` preference columns. */
export const SEED_ORGANIZATION_PREFERENCES = [
  {
    preferencesEmailNotificationsEnabled: true,
    preferencesWeeklyDigestEnabled: true,
    preferencesTimezone: "UTC",
    preferencesDigestDayOfWeek: 1,
    preferencesDigestLocalHour: 9,
  },
  {
    preferencesEmailNotificationsEnabled: true,
    preferencesWeeklyDigestEnabled: true,
    preferencesTimezone: "America/New_York",
    preferencesDigestDayOfWeek: 3,
    preferencesDigestLocalHour: 8,
  },
  {
    preferencesEmailNotificationsEnabled: true,
    preferencesWeeklyDigestEnabled: false,
    preferencesTimezone: "Europe/Warsaw",
    preferencesDigestDayOfWeek: 5,
    preferencesDigestLocalHour: 10,
  },
] as const;

export function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedRngForSubAccount(
  orgIndex: number,
  subIndex: number,
): () => number {
  const seed = orgIndex * 7919 + subIndex * 104_729 + 42;
  return createMulberry32(seed);
}

export type SeedLogicalOpportunityEvent = {
  occurredAt: Date;
  eventType: string;
  ghlPipelineStageId: string;
  ghlOpportunityId: string;
  ghlEventId: string;
  monetaryValue: string | null;
  status: string | null;
};

export const SEED_PIPELINE_ID = "seed_pipeline_main";

export function seedGhlContactId(
  orgIndex: number,
  subIndex: number,
  seq: number,
): string {
  return `seed_contact_${orgIndex}_${subIndex}_${seq}`;
}

const STAGES = [
  "seed_stage_new",
  "seed_stage_qualified",
  "seed_stage_proposal",
  "seed_stage_won",
  "seed_stage_lost",
] as const;

const EVENT_TYPES = [
  "OpportunityCreate",
  "OpportunityStageUpdate",
  "OpportunityStatusUpdate",
] as const;

/**
 * Synthetic opportunity timeline for one sub-account (~90 days, varied density).
 * Deterministic from orgIndex + subIndex.
 */
export function buildSeedLogicalOpportunityEventsForSubAccount(input: {
  orgIndex: number;
  subIndex: number;
  windowStart: Date;
  windowEnd: Date;
}): SeedLogicalOpportunityEvent[] {
  const rng = seedRngForSubAccount(input.orgIndex, input.subIndex);
  const events: SeedLogicalOpportunityEvent[] = [];
  const startMs = input.windowStart.getTime();
  const endMs = input.windowEnd.getTime();
  let oppSeq = 0;

  for (let t = startMs; t < endMs; t += 86_400_000) {
    const dayIndex = Math.floor((t - startMs) / 86_400_000);
    const n = 1 + Math.floor(rng() * 3) + (dayIndex % 5 === 0 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const occurredAt = new Date(t + Math.floor(rng() * 86_400_000));
      if (occurredAt.getTime() >= endMs) continue;

      const stage = STAGES[Math.floor(rng() * STAGES.length)] ?? STAGES[0];
      const eventType =
        EVENT_TYPES[Math.floor(rng() * EVENT_TYPES.length)] ??
        "OpportunityCreate";
      const ghlOpportunityId = `seed_opp_${input.orgIndex}_${input.subIndex}_${oppSeq}`;
      oppSeq += 1;
      const ghlEventId = `seed_ge_${input.orgIndex}_${input.subIndex}_${dayIndex}_${i}`;
      const monetaryRoll = rng();
      const monetaryValue =
        monetaryRoll > 0.12
          ? (Math.round((5000 + rng() * 95_000) * 100) / 100).toFixed(2)
          : null;
      const status =
        stage === "seed_stage_won"
          ? "won"
          : stage === "seed_stage_lost"
            ? "lost"
            : "open";

      events.push({
        occurredAt,
        eventType,
        ghlPipelineStageId: stage,
        ghlOpportunityId,
        ghlEventId,
        monetaryValue,
        status,
      });
    }
  }

  return events;
}

export function logicalEventsToMetricRows(
  events: SeedLogicalOpportunityEvent[],
): OpportunityEventMetricsRow[] {
  return events.map((e) => ({
    eventType: e.eventType,
    ghlPipelineStageId: e.ghlPipelineStageId,
    status: e.status,
    monetaryValue: e.monetaryValue,
    ghlOpportunityId: e.ghlOpportunityId,
    occurredAt: e.occurredAt,
  }));
}

export function filterMetricRowsForPeriod(
  rows: OpportunityEventMetricsRow[],
  periodStart: Date,
  periodEnd: Date,
): OpportunityEventMetricsRow[] {
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();
  return rows.filter((r) => {
    const x = r.occurredAt.getTime();
    return x >= startMs && x < endMs;
  });
}

export function buildSeedDemoAnalysisReportJson(): AnalysisReport {
  const report: AnalysisReport = {
    metrics: {
      headline: "Pipeline velocity improved vs prior period",
      periodDescription: "Last 7 days (seed demo)",
      kpis: [
        { label: "Open pipeline", value: "$284k", trend: "up" },
        { label: "Win rate", value: "34%", trend: "flat" },
        { label: "Avg cycle", value: "18d", trend: "down" },
      ],
      summary:
        "Seed data: opportunities cluster in mid-funnel; late-stage conversion is the main lever.",
    },
    anomalies: {
      anomalies: [
        {
          id: "seed_anomaly_1",
          severity: "medium",
          title: "Proposal stage backlog",
          description:
            "Several deals lingered in proposal without movement — follow-up cadence may be inconsistent.",
          affectedStage: "seed_stage_proposal",
        },
      ],
    },
    recommendations: {
      recommendations: [
        {
          title: "Tighten proposal-stage SLAs",
          body: "Define a 48-hour owner follow-up after every proposal sent; track no-replies as a first-class risk signal.",
          impact:
            "Estimated +$12k–$28k/month if 2–4 stalled deals re-activate.",
        },
        {
          title: "Win/loss capture on closed-lost",
          body: "Require a single structured reason on closed-lost so weekly reviews surface process gaps, not guesses.",
          impact:
            "Better targeting of funnel fixes; typically lifts close rate 1–3 points.",
        },
        {
          title: "Re-engage dormant qualified leads",
          body: "Run a short reactivation sequence for qualified leads with no touch in 14 days.",
          impact: "Often recovers 5–15% of dormant qualified volume.",
        },
      ],
    },
  };
  return AnalysisReportSchema.parse(report);
}
