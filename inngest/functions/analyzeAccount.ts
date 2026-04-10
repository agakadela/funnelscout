import * as Sentry from "@sentry/nextjs";
import { and, eq, ne } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { runMultiStepAnalysisAgent } from "@/lib/ai/agent";
import { AnalysisReportSchema } from "@/lib/ai/types";
import { checkPlanLimit } from "@/lib/billing";
import { analyses, organizations, subAccounts } from "@/drizzle/schema";
import { AnalysisAccountRequestedDataSchema } from "@/lib/analysis/events";
import { resolveDigestRecipientEmail } from "@/lib/analysis/digest-recipient";
import {
  buildPipelineMetricsSnapshot,
  loadOpportunityEventsForPeriod,
} from "@/lib/analysis/metrics";
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

    try {
      await runMultiStepAnalysisAgent({
        organizationId: data.organizationId,
        analysisId: data.analysisId,
        triggeredBy: data.triggeredBy,
        metricsSnapshot,
      });
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }

    await step.run("weekly-digest-email", async () => {
      const row = await db.query.analyses.findFirst({
        where: and(
          eq(analyses.id, data.analysisId),
          eq(analyses.organizationId, data.organizationId),
        ),
      });

      if (row?.status !== "completed" || !row.reportJson) {
        return { sent: false as const, reason: "not_completed" as const };
      }

      const report = AnalysisReportSchema.safeParse(row.reportJson);
      if (!report.success) {
        return { sent: false as const, reason: "invalid_report" as const };
      }

      const orgRow = await db.query.organizations.findFirst({
        where: eq(organizations.id, data.organizationId),
      });
      const subRow = await db.query.subAccounts.findFirst({
        where: and(
          eq(subAccounts.id, data.subAccountId),
          eq(subAccounts.organizationId, data.organizationId),
        ),
      });

      if (!orgRow?.betterAuthOrganizationId || !subRow) {
        return { sent: false as const, reason: "missing_org_context" as const };
      }

      const to = await resolveDigestRecipientEmail(
        orgRow.betterAuthOrganizationId,
      );
      if (!to) {
        return { sent: false as const, reason: "no_recipient" as const };
      }

      const recs = report.data.recommendations.recommendations.slice(0, 3);

      try {
        await sendWeeklyDigestEmail({
          to,
          agencyName: orgRow.name,
          subAccountName: subRow.name,
          accountPathSegment: subRow.ghlLocationId,
          recommendations: recs.map((r) => ({
            title: r.title,
            body: r.body,
            impact: r.impact,
          })),
        });
      } catch (emailErr) {
        Sentry.captureException(emailErr);
        return {
          sent: false as const,
          reason: "send_failed" as const,
          message:
            emailErr instanceof Error ? emailErr.message : "unknown_error",
        };
      }

      return { sent: true as const };
    });

    return { ok: true as const };
  },
);
