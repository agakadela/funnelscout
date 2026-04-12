import { cache } from "react";

import { and, desc, eq, inArray, max } from "drizzle-orm";

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
    let analysisRows: (typeof analyses.$inferSelect)[] = [];
    if (subIds.length > 0) {
      const latestPerSub = db
        .select({
          subAccountId: analyses.subAccountId,
          lastCreated: max(analyses.createdAt).as("lastCreated"),
        })
        .from(analyses)
        .where(
          and(
            eq(analyses.organizationId, organizationId),
            eq(analyses.status, "completed"),
            inArray(analyses.subAccountId, subIds),
          ),
        )
        .groupBy(analyses.subAccountId)
        .as("latest_per_sub");

      const joined = await db
        .select({ analysis: analyses })
        .from(analyses)
        .innerJoin(
          latestPerSub,
          and(
            eq(analyses.subAccountId, latestPerSub.subAccountId),
            eq(analyses.createdAt, latestPerSub.lastCreated),
          ),
        )
        .where(
          and(
            eq(analyses.organizationId, organizationId),
            eq(analyses.status, "completed"),
          ),
        );

      analysisRows = joined.map((j) => j.analysis);
    }

    const latestBySub = new Map(
      analysisRows.map((row) => [row.subAccountId, row] as const),
    );

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
