import { z } from "zod";
import { eq } from "drizzle-orm";
import { opportunityEvents, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { mapGhlWebhookToOpportunityEvent } from "@/lib/ghl/map-webhook-to-event";
import { GHLWebhookEventSchema } from "@/lib/ghl/types";
import { inngest } from "@/inngest/client";

const WebhookReceivedDataSchema = z.object({
  event: GHLWebhookEventSchema,
  receivedAt: z.string(),
});

export const ingestWebhook = inngest.createFunction(
  { id: "ingest-ghl-webhook", name: "Ingest GHL webhook" },
  { event: "ghl/webhook.received" },
  async ({ event }) => {
    const parsed = WebhookReceivedDataSchema.safeParse(event.data);
    if (!parsed.success) {
      console.error("ingestWebhook: invalid event data", parsed.error.flatten());
      return { skipped: true as const, reason: "invalid_payload" as const };
    }
    const { event: ghlEvent } = parsed.data;

    const sub = await db.query.subAccounts.findFirst({
      where: eq(subAccounts.ghlLocationId, ghlEvent.locationId),
    });

    if (!sub) {
      return {
        skipped: true as const,
        reason: "unknown_location" as const,
        locationId: ghlEvent.locationId,
      };
    }

    const row = mapGhlWebhookToOpportunityEvent(ghlEvent, sub.id);
    if (!row) {
      return { skipped: true as const, reason: "unmapped_event" as const };
    }

    await db
      .insert(opportunityEvents)
      .values(row)
      .onConflictDoNothing({
        target: [
          opportunityEvents.ghlOpportunityId,
          opportunityEvents.eventType,
          opportunityEvents.ghlPipelineStageId,
        ],
      });

    return { ok: true as const };
  },
);
