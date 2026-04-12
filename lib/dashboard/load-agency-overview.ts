import { eq } from "drizzle-orm";

import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import { organizations } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { formatPercentRatio } from "@/lib/dashboard/format";
import { getLastCompletedAnalysisLabelForBetterAuthOrg } from "@/lib/dashboard/last-analysis";
import {
  healthScoreFromPipelineSnapshot,
  healthTier,
  stalledDealCount,
} from "@/lib/dashboard/health-score";
import { loadSubAccountsMetricsContext } from "@/lib/dashboard/load-sub-accounts-metrics-context";

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

const EMPTY_STATS: AgencyOverviewStats = {
  totalPipelineUsd: 0,
  openDeals: 0,
  avgConversionLabel: "—",
  atRiskPipelineUsd: 0,
};

function clientRowFromSnapshot(ctx: {
  id: string;
  name: string;
  ghlLocationId: string;
  snapshot: PipelineMetricsSnapshot | null;
}): AgencyOverviewClientRow {
  const snapshot = ctx.snapshot;
  const pipelineUsd = snapshot?.sumMonetaryValue ?? 0;
  const dealCount = snapshot?.uniqueOpportunityCount ?? 0;
  const won = snapshot?.statusCounts["won"] ?? 0;
  const lost = snapshot?.statusCounts["lost"] ?? 0;
  const closed = won + lost;
  const conversion = closed === 0 ? 0 : Math.min(1, Math.max(0, won / closed));

  const healthScore = snapshot ? healthScoreFromPipelineSnapshot(snapshot) : 50;
  const tier = healthTier(healthScore);
  const stalled = snapshot ? stalledDealCount(snapshot) : 0;

  return {
    id: ctx.id,
    name: ctx.name,
    ghlLocationId: ctx.ghlLocationId,
    pipelineUsd,
    dealCount,
    conversionLabel: formatPercentRatio(conversion),
    healthScore,
    healthTier: tier,
    stalledDeals: stalled,
  };
}

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

  const contexts = await loadSubAccountsMetricsContext(orgRow.id);

  if (contexts.length === 0) {
    return {
      kind: "no_clients",
      stats: EMPTY_STATS,
      lastCompletedAnalysisLabel,
    };
  }

  const snapshotBySubId = new Map(
    contexts.map((c) => [c.id, c.snapshot] as const),
  );

  const clients: AgencyOverviewClientRow[] = contexts.map((ctx) =>
    clientRowFromSnapshot(ctx),
  );

  clients.sort((a, b) => b.healthScore - a.healthScore);

  let totalPipelineUsd = 0;
  let openDeals = 0;
  let convNumerator = 0;
  let convDenominator = 0;
  let atRiskPipelineUsd = 0;

  for (const c of clients) {
    totalPipelineUsd += c.pipelineUsd;
    const snap = snapshotBySubId.get(c.id);
    if (snap) {
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

  const lowestHealthClient = clients.at(-1);
  const runAnalysisSubAccountId = lowestHealthClient?.id ?? null;

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
