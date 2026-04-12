import { and, desc, eq } from "drizzle-orm";

import type { AnalysisReport } from "@/lib/ai/types";
import { AnalysisReportSchema } from "@/lib/ai/types";
import { analyses, organizations, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import { isPipelineMetricsSnapshot } from "@/lib/dashboard/load-agency-overview";
import {
  healthScoreFromPipelineSnapshot,
  healthTier,
} from "@/lib/dashboard/health-score";

export type AccountAnalysisHistoryRow = {
  id: string;
  status: string;
  createdAt: Date;
  periodStart: Date;
  periodEnd: Date;
};

export type AccountDrilldownData =
  | { kind: "not_found" }
  | {
      kind: "ok";
      organizationId: string;
      subAccountId: string;
      name: string;
      ghlLocationId: string;
      healthScore: number;
      healthTier: "green" | "yellow" | "red";
      lastRunLabel: string | null;
      metricsSnapshot: PipelineMetricsSnapshot | null;
      report: AnalysisReport | null;
      history: AccountAnalysisHistoryRow[];
    };

function formatRunLabel(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function loadAccountDrilldownData(input: {
  betterAuthOrganizationId: string;
  ghlLocationId: string;
}): Promise<AccountDrilldownData> {
  const orgRow = await db.query.organizations.findFirst({
    where: eq(
      organizations.betterAuthOrganizationId,
      input.betterAuthOrganizationId,
    ),
  });

  if (!orgRow) {
    return { kind: "not_found" };
  }

  const sub = await db.query.subAccounts.findFirst({
    where: and(
      eq(subAccounts.organizationId, orgRow.id),
      eq(subAccounts.ghlLocationId, input.ghlLocationId),
    ),
  });

  if (!sub) {
    return { kind: "not_found" };
  }

  const historyRows = await db.query.analyses.findMany({
    where: and(
      eq(analyses.organizationId, orgRow.id),
      eq(analyses.subAccountId, sub.id),
    ),
    orderBy: [desc(analyses.createdAt)],
    limit: 24,
  });

  const latest = historyRows[0];
  const metricsSnapshot = isPipelineMetricsSnapshot(latest?.metricsJson)
    ? latest.metricsJson
    : null;

  const healthScore = metricsSnapshot
    ? healthScoreFromPipelineSnapshot(metricsSnapshot)
    : 50;
  const tier = healthTier(healthScore);

  const reportParsed =
    latest?.reportJson != null
      ? AnalysisReportSchema.safeParse(latest.reportJson)
      : null;
  const report = reportParsed?.success ? reportParsed.data : null;

  const lastRunLabel = latest?.createdAt
    ? formatRunLabel(latest.createdAt)
    : null;

  return {
    kind: "ok",
    organizationId: orgRow.id,
    subAccountId: sub.id,
    name: sub.name,
    ghlLocationId: sub.ghlLocationId,
    healthScore,
    healthTier: tier,
    lastRunLabel,
    metricsSnapshot,
    report,
    history: historyRows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
    })),
  };
}
