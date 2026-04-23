import * as Sentry from "@sentry/nextjs";
import { and, eq, ne } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { runMultiStepAnalysisAgent } from "@/lib/ai/agent";
import { checkPlanLimit } from "@/lib/billing";
import { analyses } from "@/drizzle/schema";
import { AnalysisAccountRequestedDataSchema } from "@/lib/analysis/events";
import {
  buildPipelineMetricsSnapshot,
  loadOpportunityEventsForPeriod,
} from "@/lib/analysis/metrics";
import { runWeeklyDigestAfterAnalysis } from "@/lib/analysis/weekly-digest-after-analysis";
import { db } from "@/lib/db";
import { sendWeeklyDigestEmail } from "@/lib/resend";
import { inngest } from "@/inngest/client";

type PreconditionOutcome =
  | { skip: true; reason: "missing_analysis" }
  | { skip: true; reason: "not_pending"; status: string }
  | { skip: true; reason: "other_running" }
  | { skip: true; reason: "plan_blocked" }
  | { skip: false };

/**
 * Limits concurrent step execution for this function across runs (default scope: fn).
 * Set to 3 as a conservative default vs Anthropic rate limits; raise only after
 * confirming your Anthropic tier throughput.
 */
const ANALYZE_ACCOUNT_CONCURRENCY = 3;

export const analyzeAccount = inngest.createFunction(
  {
    id: "analyze-account",
    name: "Analyze sub-account pipeline",
    concurrency: { limit: ANALYZE_ACCOUNT_CONCURRENCY },
  },
  { event: "analysis/account.requested" },
  async ({ event, step }) => {
    const parsed = AnalysisAccountRequestedDataSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new NonRetriableError(
        `Invalid analysis/account.requested payload: ${parsed.error.message}`,
      );
    }
    const data = parsed.data;

    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);
    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime())
    ) {
      throw new NonRetriableError("Invalid periodStart / periodEnd");
    }

    const skipResult = await step.run(
      "preconditions",
      async (): Promise<PreconditionOutcome> => {
        const analysisRow = await db.query.analyses.findFirst({
          where: and(
            eq(analyses.id, data.analysisId),
            eq(analyses.organizationId, data.organizationId),
          ),
        });

        if (!analysisRow) {
          return { skip: true as const, reason: "missing_analysis" as const };
        }

        if (analysisRow.status !== "pending") {
          return {
            skip: true as const,
            reason: "not_pending" as const,
            status: analysisRow.status,
          };
        }

        const [otherRunning] = await db
          .select({ id: analyses.id })
          .from(analyses)
          .where(
            and(
              eq(analyses.organizationId, data.organizationId),
              eq(analyses.subAccountId, data.subAccountId),
              eq(analyses.status, "running"),
              ne(analyses.id, data.analysisId),
            ),
          )
          .limit(1);

        if (otherRunning) {
          await db
            .update(analyses)
            .set({
              status: "failed",
              errorMessage:
                "Another analysis is already running for this sub-account",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(analyses.id, data.analysisId),
                eq(analyses.organizationId, data.organizationId),
              ),
            );
          return { skip: true as const, reason: "other_running" as const };
        }

        const plan = await checkPlanLimit(data.organizationId);
        if (!plan.allowed) {
          await db
            .update(analyses)
            .set({
              status: "failed",
              errorMessage: "Plan limit or subscription blocks analysis",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(analyses.id, data.analysisId),
                eq(analyses.organizationId, data.organizationId),
              ),
            );
          return { skip: true as const, reason: "plan_blocked" as const };
        }

        return { skip: false as const };
      },
    );

    if (skipResult.skip) {
      return { ok: false as const, skipped: skipResult };
    }

    const metricsSnapshot = await step.run("build-metrics", async () => {
      const rows = await loadOpportunityEventsForPeriod({
        organizationId: data.organizationId,
        subAccountId: data.subAccountId,
        periodStart,
        periodEnd,
      });
      return buildPipelineMetricsSnapshot({
        periodStart,
        periodEnd,
        subAccountId: data.subAccountId,
        rows,
      });
    });

    await step.run("persist-metrics", async () => {
      await db
        .update(analyses)
        .set({ metricsJson: metricsSnapshot, updatedAt: new Date() })
        .where(
          and(
            eq(analyses.id, data.analysisId),
            eq(analyses.organizationId, data.organizationId),
          ),
        );
    });

    await step.run("run-agent", async () => {
      try {
        // Inngest memoizes completed steps: retries skip re-running Claude and duplicate cost_logs inserts.
        await runMultiStepAnalysisAgent({
          organizationId: data.organizationId,
          analysisId: data.analysisId,
          triggeredBy: data.triggeredBy,
          metricsSnapshot,
        });
      } catch (err) {
        Sentry.withScope((scope) => {
          scope.setTag("inngest.function", "analyze-account");
          scope.setContext("tenant", {
            organizationId: data.organizationId,
            analysisId: data.analysisId,
            subAccountId: data.subAccountId,
          });
          Sentry.captureException(err);
        });
        throw err;
      }
    });

    await step.run("weekly-digest-email", async () => {
      return runWeeklyDigestAfterAnalysis({
        organizationId: data.organizationId,
        analysisId: data.analysisId,
        subAccountId: data.subAccountId,
        db,
        sendWeeklyDigestEmail,
      });
    });

    return { ok: true as const };
  },
);
