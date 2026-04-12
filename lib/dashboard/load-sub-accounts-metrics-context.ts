import { cache } from "react";

import { and, desc, eq, inArray } from "drizzle-orm";

import {
  isPipelineMetricsSnapshot,
  type PipelineMetricsSnapshot,
} from "@/lib/analysis/metrics";
import { analyses, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";

export type SubAccountMetricsContext = {
  id: string;
  name: string;
  ghlLocationId: string;
  snapshot: PipelineMetricsSnapshot | null;
};

export const loadSubAccountsMetricsContext = cache(
  async (organizationId: string): Promise<SubAccountMetricsContext[]> => {
    const subs = await db.query.subAccounts.findMany({
      where: and(
        eq(subAccounts.organizationId, organizationId),
        eq(subAccounts.isActive, true),
      ),
      orderBy: [desc(subAccounts.createdAt)],
    });

    const subIds = subs.map((s) => s.id);
    const analysisRows =
      subIds.length === 0
        ? []
        : await db.query.analyses.findMany({
            where: and(
              eq(analyses.organizationId, organizationId),
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

    return subs.map((sub) => {
      const latest = latestBySub.get(sub.id);
      const raw = latest?.metricsJson;
      const snapshot = isPipelineMetricsSnapshot(raw) ? raw : null;
      return {
        id: sub.id,
        name: sub.name,
        ghlLocationId: sub.ghlLocationId,
        snapshot,
      };
    });
  },
);
