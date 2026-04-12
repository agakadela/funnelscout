import { and, desc, eq, inArray } from "drizzle-orm";

import {
  PipelineMetricsSnapshotSchema,
  type PipelineMetricsSnapshot,
} from "@/lib/analysis/metrics";
import { analyses, organizations, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { formatPercentRatio } from "@/lib/dashboard/format";
import { getLastCompletedAnalysisLabelForBetterAuthOrg } from "@/lib/dashboard/last-analysis";
import {
  healthScoreFromPipelineSnapshot,
  healthTier,
  stalledDealCount,
} from "@/lib/dashboard/health-score";

export type AgencyOverviewClientRow = {
  id: string;
  name: string;
  ghlLocationId: string;
  pipelineUsd: number;
  dealCount: number;
  conversionLabel: string;
  healthScore: number;
  healthTier: "green" | "yellow" | "red";
  stalledDeals: number;
};

export type AgencyOverviewStats = {
  totalPipelineUsd: number;
  openDeals: number;
  avgConversionLabel: string;
  /** Sum of pipeline value for clients in the red health band (“At risk” in overview). */
  atRiskPipelineUsd: number;
};

export type AgencyOverviewData =
  | { kind: "no_ghl" }
  | {
      kind: "no_clients";
      stats: AgencyOverviewStats;
      lastCompletedAnalysisLabel: string | null;
    }
  | {
      kind: "ready";
      stats: AgencyOverviewStats;
      clients: AgencyOverviewClientRow[];
      runAnalysisSubAccountId: string | null;
      lastCompletedAnalysisLabel: string | null;
    };

export function isPipelineMetricsSnapshot(
  value: unknown,
): value is PipelineMetricsSnapshot {
  return PipelineMetricsSnapshotSchema.safeParse(value).success;
}

const EMPTY_STATS: AgencyOverviewStats = {
  totalPipelineUsd: 0,
  openDeals: 0,
  avgConversionLabel: "—",
  atRiskPipelineUsd: 0,
};

export async function loadAgencyOverviewData(input: {
  betterAuthOrganizationId: string;
}): Promise<AgencyOverviewData> {
  const orgRow = await db.query.organizations.findFirst({
    where: eq(
      organizations.betterAuthOrganizationId,
      input.betterAuthOrganizationId,
    ),
  });

  if (!orgRow) {
    return { kind: "no_ghl" };
  }

  if (!orgRow.ghlAccessToken) {
    return { kind: "no_ghl" };
  }

  const lastCompletedAnalysisLabel =
    await getLastCompletedAnalysisLabelForBetterAuthOrg(
      input.betterAuthOrganizationId,
    );

  const subs = await db.query.subAccounts.findMany({
    where: and(
      eq(subAccounts.organizationId, orgRow.id),
      eq(subAccounts.isActive, true),
    ),
    orderBy: [desc(subAccounts.createdAt)],
  });

  if (subs.length === 0) {
    return {
      kind: "no_clients",
      stats: EMPTY_STATS,
      lastCompletedAnalysisLabel,
    };
  }

  const subIds = subs.map((s) => s.id);

  const analysisRows =
    subIds.length === 0
      ? []
      : await db.query.analyses.findMany({
          where: and(
            eq(analyses.organizationId, orgRow.id),
            eq(analyses.status, "completed"),
            inArray(analyses.subAccountId, subIds),
          ),
          orderBy: [desc(analyses.createdAt)],
        });

  const latestBySub = new Map<string, (typeof analysisRows)[number]>();
  for (const row of analysisRows) {
    if (!latestBySub.has(row.subAccountId)) {
      latestBySub.set(row.subAccountId, row);
    }
  }

  const clients: AgencyOverviewClientRow[] = subs.map((sub) => {
    const latest = latestBySub.get(sub.id);
    const metricsUnknown = latest?.metricsJson;
    const snapshot = isPipelineMetricsSnapshot(metricsUnknown)
      ? metricsUnknown
      : null;

    const pipelineUsd = snapshot?.sumMonetaryValue ?? 0;
    const dealCount = snapshot?.uniqueOpportunityCount ?? 0;
    const won = snapshot?.statusCounts["won"] ?? 0;
    const lost = snapshot?.statusCounts["lost"] ?? 0;
    const closed = won + lost;
    const conversion =
      closed === 0 ? 0 : Math.min(1, Math.max(0, won / closed));

    const healthScore = snapshot
      ? healthScoreFromPipelineSnapshot(snapshot)
      : 50;
    const tier = healthTier(healthScore);
    const stalled = snapshot ? stalledDealCount(snapshot) : 0;

    return {
      id: sub.id,
      name: sub.name,
      ghlLocationId: sub.ghlLocationId,
      pipelineUsd,
      dealCount,
      conversionLabel: formatPercentRatio(conversion),
      healthScore,
      healthTier: tier,
      stalledDeals: stalled,
    };
  });

  clients.sort((a, b) => b.healthScore - a.healthScore);

  let totalPipelineUsd = 0;
  let openDeals = 0;
  let convNumerator = 0;
  let convDenominator = 0;
  let atRiskPipelineUsd = 0;

  for (const c of clients) {
    totalPipelineUsd += c.pipelineUsd;
    const latest = latestBySub.get(c.id);
    const snap = latest?.metricsJson;
    if (isPipelineMetricsSnapshot(snap)) {
      openDeals += snap.statusCounts["open"] ?? 0;
      const won = snap.statusCounts["won"] ?? 0;
      const lost = snap.statusCounts["lost"] ?? 0;
      convNumerator += won;
      convDenominator += won + lost;
    }
    if (c.healthTier === "red") {
      atRiskPipelineUsd += c.pipelineUsd;
    }
  }

  const avgConversion =
    convDenominator === 0 ? 0 : convNumerator / convDenominator;

  const runAnalysisSubAccountId =
    clients.length > 0 ? clients[clients.length - 1].id : null;

  return {
    kind: "ready",
    stats: {
      totalPipelineUsd,
      openDeals,
      avgConversionLabel: formatPercentRatio(avgConversion),
      atRiskPipelineUsd,
    },
    clients,
    runAnalysisSubAccountId,
    lastCompletedAnalysisLabel,
  };
}
