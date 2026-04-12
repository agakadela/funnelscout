import { and, eq, inArray } from "drizzle-orm";
import type { AnalysisTriggerSource } from "@/lib/ai/agent";
import type { AnalysisAccountRequestedData } from "@/lib/analysis/events";
import {
  analysisIdempotencyId,
  getCompletedUtcWeekRange,
} from "@/lib/analysis/period";
import { checkPlanLimit, type PlanLimitResult } from "@/lib/billing";
import { analyses, costLogs } from "@/drizzle/schema";
import { db } from "@/lib/db";

export type PrepareAccountAnalysisResult =
  | {
      outcome: "blocked_plan";
      plan: Extract<PlanLimitResult, { allowed: false }>;
    }
  | { outcome: "done_already"; analysisId: string }
  | {
      outcome: "send";
      analysisId: string;
      idempotencyId: string;
      eventPayload: AnalysisAccountRequestedData;
    };

async function deleteCostLogsForAnalysisInOrg(input: {
  organizationId: string;
  analysisId: string;
}): Promise<void> {
  const owned = db
    .select({ id: analyses.id })
    .from(analyses)
    .where(
      and(
        eq(analyses.id, input.analysisId),
        eq(analyses.organizationId, input.organizationId),
      ),
    );

  await db.delete(costLogs).where(inArray(costLogs.analysisId, owned));
}

async function resetFailedAnalysisForRetry(input: {
  organizationId: string;
  analysisId: string;
  subAccountId: string;
  triggeredBy: AnalysisTriggerSource;
  periodEnd: Date;
}): Promise<void> {
  await deleteCostLogsForAnalysisInOrg({
    organizationId: input.organizationId,
    analysisId: input.analysisId,
  });

  await db
    .update(analyses)
    .set({
      status: "pending",
      triggeredBy: input.triggeredBy,
      periodEnd: input.periodEnd,
      errorMessage: null,
      reportJson: null,
      metricsJson: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(analyses.id, input.analysisId),
        eq(analyses.organizationId, input.organizationId),
        eq(analyses.subAccountId, input.subAccountId),
        eq(analyses.status, "failed"),
      ),
    );
}

export async function prepareAccountAnalysis(input: {
  organizationId: string;
  subAccountId: string;
  triggeredBy: AnalysisTriggerSource;
}): Promise<PrepareAccountAnalysisResult> {
  const plan = await checkPlanLimit(input.organizationId);
  if (!plan.allowed) {
    return { outcome: "blocked_plan", plan };
  }

  const { periodStart, periodEnd } = getCompletedUtcWeekRange(new Date());

  const periodWhere = and(
    eq(analyses.organizationId, input.organizationId),
    eq(analyses.subAccountId, input.subAccountId),
    eq(analyses.periodStart, periodStart),
  );

  const row = await db.query.analyses.findFirst({
    where: periodWhere,
  });

  if (row?.status === "completed") {
    return { outcome: "done_already", analysisId: row.id };
  }

  let analysisId: string;

  if (row?.status === "failed") {
    await resetFailedAnalysisForRetry({
      organizationId: input.organizationId,
      analysisId: row.id,
      subAccountId: input.subAccountId,
      triggeredBy: input.triggeredBy,
      periodEnd,
    });
    analysisId = row.id;
  } else if (row) {
    analysisId = row.id;
  } else {
    const [inserted] = await db
      .insert(analyses)
      .values({
        organizationId: input.organizationId,
        subAccountId: input.subAccountId,
        triggeredBy: input.triggeredBy,
        status: "pending",
        periodStart,
        periodEnd,
      })
      .onConflictDoNothing({
        target: [analyses.subAccountId, analyses.periodStart],
      })
      .returning({ id: analyses.id });

    if (inserted) {
      analysisId = inserted.id;
    } else {
      const row2 = await db.query.analyses.findFirst({
        where: periodWhere,
      });
      if (!row2) {
        throw new Error("Expected analysis row after insert conflict");
      }
      if (row2.status === "completed") {
        return { outcome: "done_already", analysisId: row2.id };
      }
      if (row2.status === "failed") {
        await resetFailedAnalysisForRetry({
          organizationId: input.organizationId,
          analysisId: row2.id,
          subAccountId: input.subAccountId,
          triggeredBy: input.triggeredBy,
          periodEnd,
        });
        analysisId = row2.id;
      } else {
        analysisId = row2.id;
      }
    }
  }

  const eventPayload: AnalysisAccountRequestedData = {
    analysisId,
    organizationId: input.organizationId,
    subAccountId: input.subAccountId,
    triggeredBy: input.triggeredBy,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };

  return {
    outcome: "send",
    analysisId,
    idempotencyId: analysisIdempotencyId(input.subAccountId, periodStart),
    eventPayload,
  };
}
