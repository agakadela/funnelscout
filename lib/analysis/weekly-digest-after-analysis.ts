import * as Sentry from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";

import { AnalysisReportSchema } from "@/lib/ai/types";
import { resolveDigestRecipientEmail } from "@/lib/analysis/digest-recipient";
import { analyses, organizations, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import type { sendWeeklyDigestEmail as sendWeeklyDigestEmailFn } from "@/lib/resend";

type DigestDb = Pick<typeof db, "query">;

export type WeeklyDigestAfterAnalysisSkipReason =
  | "not_completed"
  | "invalid_report"
  | "missing_org_context"
  | "weekly_digest_disabled"
  | "email_notifications_disabled"
  | "no_recipient"
  | "send_failed";

export type WeeklyDigestAfterAnalysisResult =
  | { sent: true }
  | {
      sent: false;
      reason: WeeklyDigestAfterAnalysisSkipReason;
      message?: string;
    };

/** Fail-closed: weekly digest sends only when both org toggles are explicitly true. */
export function weeklyDigestAllowedByOrganizationPreferences(org: {
  preferencesWeeklyDigestEnabled: boolean;
  preferencesEmailNotificationsEnabled: boolean;
}): boolean {
  return (
    org.preferencesWeeklyDigestEnabled === true &&
    org.preferencesEmailNotificationsEnabled === true
  );
}

export async function runWeeklyDigestAfterAnalysis(input: {
  organizationId: string;
  analysisId: string;
  subAccountId: string;
  db: DigestDb;
  sendWeeklyDigestEmail: typeof sendWeeklyDigestEmailFn;
}): Promise<WeeklyDigestAfterAnalysisResult> {
  const {
    organizationId,
    analysisId,
    subAccountId,
    db,
    sendWeeklyDigestEmail,
  } = input;

  const row = await db.query.analyses.findFirst({
    where: and(
      eq(analyses.id, analysisId),
      eq(analyses.organizationId, organizationId),
    ),
  });

  if (row?.status !== "completed" || !row.reportJson) {
    return { sent: false, reason: "not_completed" };
  }

  const report = AnalysisReportSchema.safeParse(row.reportJson);
  if (!report.success) {
    return { sent: false, reason: "invalid_report" };
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: {
      id: true,
      name: true,
      betterAuthOrganizationId: true,
      preferencesWeeklyDigestEnabled: true,
      preferencesEmailNotificationsEnabled: true,
    },
  });

  const subRow = await db.query.subAccounts.findFirst({
    where: and(
      eq(subAccounts.id, subAccountId),
      eq(subAccounts.organizationId, organizationId),
    ),
  });

  if (!orgRow?.betterAuthOrganizationId || !subRow) {
    return { sent: false, reason: "missing_org_context" };
  }

  if (!weeklyDigestAllowedByOrganizationPreferences(orgRow)) {
    if (orgRow.preferencesWeeklyDigestEnabled !== true) {
      return { sent: false, reason: "weekly_digest_disabled" };
    }
    return { sent: false, reason: "email_notifications_disabled" };
  }

  const to = await resolveDigestRecipientEmail(orgRow.betterAuthOrganizationId);
  if (!to) {
    return { sent: false, reason: "no_recipient" };
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
    Sentry.withScope((scope) => {
      scope.setTag("inngest.function", "analyze-account");
      scope.setTag("inngest.step", "weekly-digest-email");
      scope.setContext("tenant", {
        organizationId,
        analysisId,
        subAccountId,
      });
      Sentry.captureException(emailErr);
    });
    return {
      sent: false,
      reason: "send_failed",
      message: emailErr instanceof Error ? emailErr.message : "unknown_error",
    };
  }

  return { sent: true };
}
