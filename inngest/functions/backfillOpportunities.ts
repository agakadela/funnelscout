import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  opportunityEvents,
  organizations,
  subAccounts,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { fetchCompanyLocations, fetchOpportunities } from "@/lib/ghl/client";
import type { GhlOpportunityRecord } from "@/lib/ghl/types";
import { inngest } from "@/inngest/client";

const OAuthConnectedDataSchema = z.object({
  organizationId: z.string(),
});

function threeMonthsAgo(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
}

function mapApiOpportunityToRow(
  subAccountId: string,
  opp: GhlOpportunityRecord,
): typeof opportunityEvents.$inferInsert | null {
  const id = opp.id;
  const contactId = opp.contactId ?? opp.contact_id;
  const pipelineId = opp.pipelineId ?? opp.pipeline_id;
  const stageId = opp.pipelineStageId ?? opp.pipeline_stage_id;
  if (!id || !contactId || !pipelineId || !stageId) {
    return null;
  }
  const monetary = opp.monetaryValue ?? opp.monetary_value ?? null;
  const status = opp.status ?? null;
  const occurredRaw =
    opp.updatedAt ?? opp.updated_at ?? opp.createdAt ?? opp.created_at;
  const occurredAt = occurredRaw ? new Date(occurredRaw) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return null;
  }
  return {
    subAccountId,
    ghlOpportunityId: id,
    ghlEventId: null,
    ghlContactId: contactId,
    ghlPipelineId: pipelineId,
    ghlPipelineStageId: stageId,
    eventType: "OpportunityBackfill",
    monetaryValue: monetary != null ? String(monetary) : null,
    status,
    rawPayload: opp,
    occurredAt,
  };
}

export const backfillOpportunities = inngest.createFunction(
  { id: "backfill-opportunities", name: "Backfill GHL opportunities" },
  { event: "ghl/oauth.connected" },
  async ({ event, step }) => {
    const dataParsed = OAuthConnectedDataSchema.safeParse(event.data);
    if (!dataParsed.success) {
      console.error("backfillOpportunities: invalid event data", dataParsed.error.flatten());
      return { skipped: true as const, reason: "invalid_payload" as const };
    }
    const { organizationId } = dataParsed.data;

    const org = await step.run("load-organization", async () => {
      const row = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });
      return row;
    });

    if (!org?.ghlAgencyId) {
      return { skipped: true as const, reason: "missing_company_id" as const };
    }

    const locations = await step.run("list-locations", async () => {
      return fetchCompanyLocations(organizationId, org.ghlAgencyId!);
    });

    for (const loc of locations) {
      await step.run(`upsert-sub-${loc.id}`, async () => {
        await db
          .insert(subAccounts)
          .values({
            organizationId,
            ghlLocationId: loc.id,
            name: loc.name,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: subAccounts.ghlLocationId,
            set: {
              name: loc.name,
              isActive: true,
              organizationId,
            },
          });
      });
    }

    const since = threeMonthsAgo();

    for (const loc of locations) {
      await step.run(`backfill-${loc.id}`, async () => {
        const sub = await db.query.subAccounts.findFirst({
          where: and(
            eq(subAccounts.organizationId, organizationId),
            eq(subAccounts.ghlLocationId, loc.id),
          ),
        });
        if (!sub) return;
        const opps = await fetchOpportunities(organizationId, loc.id, since);
        const rows = opps
          .map((opp) => mapApiOpportunityToRow(sub.id, opp))
          .filter((r): r is NonNullable<typeof r> => r !== null);
        if (rows.length > 0) {
          await db
            .insert(opportunityEvents)
            .values(rows)
            .onConflictDoNothing({
              target: [
                opportunityEvents.ghlOpportunityId,
                opportunityEvents.eventType,
                opportunityEvents.ghlPipelineStageId,
              ],
            });
        }
      });
    }

    return { ok: true as const };
  },
);
