import { and, eq } from "drizzle-orm";

import type { AnalysisAccountRequestedData } from "@/lib/analysis/events";
import { prepareAccountAnalysis } from "@/lib/analysis/enqueue";
import { subAccounts, subscriptions } from "@/drizzle/schema";
import { db } from "@/lib/db";

export type WeeklyAnalysisSubAccountRow = {
  organizationId: string;
  subAccountId: string;
};

export type WeeklyAnalysisOutgoingEvent = {
  id: string;
  name: "analysis/account.requested";
  data: AnalysisAccountRequestedData;
};

export async function listWeeklyAnalysisSubAccountTargets(): Promise<
  WeeklyAnalysisSubAccountRow[]
> {
  return db
    .select({
      organizationId: subAccounts.organizationId,
      subAccountId: subAccounts.id,
    })
    .from(subAccounts)
    .innerJoin(
      subscriptions,
      eq(subscriptions.organizationId, subAccounts.organizationId),
    )
    .where(
      and(eq(subAccounts.isActive, true), eq(subscriptions.status, "active")),
    );
}

export async function buildWeeklyAnalysisOutgoingEvents(
  subRows: WeeklyAnalysisSubAccountRow[],
): Promise<WeeklyAnalysisOutgoingEvent[]> {
  const events: WeeklyAnalysisOutgoingEvent[] = [];

  for (const row of subRows) {
    const prepared = await prepareAccountAnalysis({
      organizationId: row.organizationId,
      subAccountId: row.subAccountId,
      triggeredBy: "scheduled",
    });
    if (prepared.outcome === "send") {
      events.push({
        id: prepared.idempotencyId,
        name: "analysis/account.requested",
        data: prepared.eventPayload,
      });
    }
  }

  return events;
}
