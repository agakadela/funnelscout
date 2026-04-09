import type { GHLWebhookEvent } from "@/lib/ghl/types";

export type OpportunityEventInsert = {
  subAccountId: string;
  ghlOpportunityId: string;
  ghlEventId: string | null;
  ghlContactId: string;
  ghlPipelineId: string;
  ghlPipelineStageId: string;
  eventType: string;
  monetaryValue: string | null;
  status: string | null;
  rawPayload: unknown;
  occurredAt: Date;
};

function parseIsoDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function mapGhlWebhookToOpportunityEvent(
  event: GHLWebhookEvent,
  subAccountId: string,
): OpportunityEventInsert | null {
  const now = new Date();
  switch (event.type) {
    case "OpportunityCreate":
      return {
        subAccountId,
        ghlOpportunityId: event.data.id,
        ghlEventId: null,
        ghlContactId: event.data.contactId,
        ghlPipelineId: event.data.pipelineId,
        ghlPipelineStageId: event.data.pipelineStageId,
        eventType: event.type,
        monetaryValue: String(event.data.monetaryValue),
        status: event.data.status,
        rawPayload: event,
        occurredAt: parseIsoDate(event.data.createdAt, now),
      };
    case "OpportunityStageUpdate":
      return {
        subAccountId,
        ghlOpportunityId: event.data.id,
        ghlEventId: null,
        ghlContactId: event.data.contactId,
        ghlPipelineId: event.data.pipelineId,
        ghlPipelineStageId: event.data.pipelineStageId,
        eventType: event.type,
        monetaryValue: String(event.data.monetaryValue),
        status: event.data.status,
        rawPayload: event,
        occurredAt: parseIsoDate(event.data.updatedAt, now),
      };
    case "OpportunityStatusUpdate":
      return {
        subAccountId,
        ghlOpportunityId: event.data.id,
        ghlEventId: null,
        ghlContactId: event.data.contactId,
        ghlPipelineId: "__status__",
        ghlPipelineStageId: `status:${event.data.status}`,
        eventType: event.type,
        monetaryValue: null,
        status: event.data.status,
        rawPayload: event,
        occurredAt: parseIsoDate(event.data.updatedAt, now),
      };
    case "OrderCreate":
      return {
        subAccountId,
        ghlOpportunityId: `order:${event.data.id}`,
        ghlEventId: null,
        ghlContactId: event.data.contactId,
        ghlPipelineId: "__order__",
        ghlPipelineStageId: "__order__",
        eventType: event.type,
        monetaryValue: String(event.data.totalPrice),
        status: null,
        rawPayload: event,
        occurredAt: parseIsoDate(event.data.createdAt, now),
      };
    default:
      return null;
  }
}
