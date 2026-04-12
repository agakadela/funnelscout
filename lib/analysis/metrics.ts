import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";

import { opportunityEvents, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";

export const PipelineMetricsSnapshotSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  subAccountId: z.string(),
  eventCount: z.number(),
  uniqueOpportunityCount: z.number(),
  eventsByType: z.record(z.string(), z.number()),
  eventsByStageId: z.record(z.string(), z.number()),
  statusCounts: z.record(z.string(), z.number()),
  sumMonetaryValue: z.number(),
});

export type OpportunityEventMetricsRow = {
  eventType: string;
  ghlPipelineStageId: string;
  status: string | null;
  monetaryValue: string | null;
  ghlOpportunityId: string;
  occurredAt: Date;
};

export type PipelineMetricsSnapshot = {
  periodStart: string;
  periodEnd: string;
  subAccountId: string;
  eventCount: number;
  uniqueOpportunityCount: number;
  eventsByType: Record<string, number>;
  eventsByStageId: Record<string, number>;
  statusCounts: Record<string, number>;
  sumMonetaryValue: number;
};

export function isPipelineMetricsSnapshot(
  value: unknown,
): value is PipelineMetricsSnapshot {
  return PipelineMetricsSnapshotSchema.safeParse(value).success;
}

export function buildPipelineMetricsSnapshot(input: {
  periodStart: Date;
  periodEnd: Date;
  subAccountId: string;
  rows: OpportunityEventMetricsRow[];
}): PipelineMetricsSnapshot {
  const eventsByType: Record<string, number> = {};
  const eventsByStageId: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const uniqueOpps = new Set<string>();
  let sumMonetary = 0;

  for (const row of input.rows) {
    uniqueOpps.add(row.ghlOpportunityId);
    eventsByType[row.eventType] = (eventsByType[row.eventType] ?? 0) + 1;
    eventsByStageId[row.ghlPipelineStageId] =
      (eventsByStageId[row.ghlPipelineStageId] ?? 0) + 1;
    const statusKey = row.status ?? "unknown";
    statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;
    if (row.monetaryValue != null && row.monetaryValue !== "") {
      const n = Number(row.monetaryValue);
      if (!Number.isNaN(n)) {
        sumMonetary += n;
      }
    }
  }

  return {
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    subAccountId: input.subAccountId,
    eventCount: input.rows.length,
    uniqueOpportunityCount: uniqueOpps.size,
    eventsByType,
    eventsByStageId,
    statusCounts,
    sumMonetaryValue: sumMonetary,
  };
}

export async function loadOpportunityEventsForPeriod(input: {
  organizationId: string;
  subAccountId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<OpportunityEventMetricsRow[]> {
  return db
    .select({
      eventType: opportunityEvents.eventType,
      ghlPipelineStageId: opportunityEvents.ghlPipelineStageId,
      status: opportunityEvents.status,
      monetaryValue: opportunityEvents.monetaryValue,
      ghlOpportunityId: opportunityEvents.ghlOpportunityId,
      occurredAt: opportunityEvents.occurredAt,
    })
    .from(opportunityEvents)
    .innerJoin(subAccounts, eq(opportunityEvents.subAccountId, subAccounts.id))
    .where(
      and(
        eq(subAccounts.organizationId, input.organizationId),
        eq(opportunityEvents.subAccountId, input.subAccountId),
        gte(opportunityEvents.occurredAt, input.periodStart),
        lt(opportunityEvents.occurredAt, input.periodEnd),
      ),
    );
}
