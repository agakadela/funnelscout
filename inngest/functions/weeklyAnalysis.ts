import { and, eq } from "drizzle-orm";

import type { AnalysisAccountRequestedData } from "@/lib/analysis/events";
import { prepareAccountAnalysis } from "@/lib/analysis/enqueue";
import { subAccounts, subscriptions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";

/**
 * Monday 17:00 UTC — approximately 09:00 Pacific (standard) or 10:00 Pacific (daylight saving).
 */
const WEEKLY_CRON_UTC = "0 17 * * 1";

export const weeklyAnalysis = inngest.createFunction(
  {
    id: "weekly-analysis",
    name: "Weekly analysis fan-out",
  },
  { cron: WEEKLY_CRON_UTC },
  async ({ step }) => {
    const subRows = await step.run("list-active-sub-accounts", async () => {
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
          and(
            eq(subAccounts.isActive, true),
            eq(subscriptions.status, "active"),
          ),
        );
    });

    const toSend = await step.run("prepare-analysis-jobs", async () => {
      const events: {
        id: string;
        name: "analysis/account.requested";
        data: AnalysisAccountRequestedData;
      }[] = [];

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
    });

    if (toSend.length === 0) {
      return { ok: true as const, sent: 0 };
    }

    await step.sendEvent("emit-account-analysis-requests", toSend);

    return { ok: true as const, sent: toSend.length };
  },
);
