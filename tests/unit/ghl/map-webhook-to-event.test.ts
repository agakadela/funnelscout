import { afterEach, describe, expect, it, vi } from "vitest";
import { mapGhlWebhookToOpportunityEvent } from "@/lib/ghl/map-webhook-to-event";
import { GHLWebhookEventSchema } from "@/lib/ghl/types";

const subAccountId = "sub_account_test";

describe("mapGhlWebhookToOpportunityEvent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps OpportunityCreate to an insert row", () => {
    const event = GHLWebhookEventSchema.parse({
      type: "OpportunityCreate",
      locationId: "loc_1",
      data: {
        id: "opp_1",
        contactId: "con_1",
        pipelineId: "pipe_1",
        pipelineStageId: "stage_1",
        monetaryValue: 42.5,
        status: "open",
        createdAt: "2026-01-10T12:00:00.000Z",
      },
    });
    const row = mapGhlWebhookToOpportunityEvent(event, subAccountId);
    expect(row).toEqual({
      subAccountId,
      ghlOpportunityId: "opp_1",
      ghlEventId: null,
      ghlContactId: "con_1",
      ghlPipelineId: "pipe_1",
      ghlPipelineStageId: "stage_1",
      eventType: "OpportunityCreate",
      monetaryValue: "42.5",
      status: "open",
      rawPayload: event,
      occurredAt: new Date("2026-01-10T12:00:00.000Z"),
    });
  });

  it("maps OpportunityStageUpdate using updatedAt", () => {
    const event = GHLWebhookEventSchema.parse({
      type: "OpportunityStageUpdate",
      locationId: "loc_1",
      data: {
        id: "opp_1",
        contactId: "con_1",
        pipelineId: "pipe_1",
        pipelineStageId: "stage_2",
        monetaryValue: 10,
        status: "open",
        updatedAt: "2026-01-11T15:30:00.000Z",
      },
    });
    const row = mapGhlWebhookToOpportunityEvent(event, subAccountId);
    expect(row?.occurredAt.toISOString()).toBe("2026-01-11T15:30:00.000Z");
  });

  it("maps OpportunityStatusUpdate to synthetic pipeline and stage ids", () => {
    const event = GHLWebhookEventSchema.parse({
      type: "OpportunityStatusUpdate",
      locationId: "loc_1",
      data: {
        id: "opp_1",
        contactId: "con_1",
        status: "won",
        updatedAt: "2026-01-12T00:00:00.000Z",
      },
    });
    const row = mapGhlWebhookToOpportunityEvent(event, subAccountId);
    expect(row?.ghlPipelineId).toBe("__status__");
    expect(row?.ghlPipelineStageId).toBe("status:won");
    expect(row?.monetaryValue).toBeNull();
    expect(row?.status).toBe("won");
  });

  it("maps OrderCreate with order-prefixed opportunity id and order placeholders", () => {
    const event = GHLWebhookEventSchema.parse({
      type: "OrderCreate",
      locationId: "loc_1",
      data: {
        id: "ord_9",
        contactId: "con_1",
        totalPrice: 199,
        currency: "USD",
        createdAt: "2026-01-13T08:00:00.000Z",
      },
    });
    const row = mapGhlWebhookToOpportunityEvent(event, subAccountId);
    expect(row?.ghlOpportunityId).toBe("order:ord_9");
    expect(row?.ghlPipelineId).toBe("__order__");
    expect(row?.ghlPipelineStageId).toBe("__order__");
    expect(row?.monetaryValue).toBe("199");
    expect(row?.status).toBeNull();
  });

  it("falls back to current time when createdAt is not a valid ISO date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    const event = GHLWebhookEventSchema.parse({
      type: "OpportunityCreate",
      locationId: "loc_1",
      data: {
        id: "opp_1",
        contactId: "con_1",
        pipelineId: "pipe_1",
        pipelineStageId: "stage_1",
        monetaryValue: 0,
        status: "open",
        createdAt: "not-a-date",
      },
    });
    const row = mapGhlWebhookToOpportunityEvent(event, subAccountId);
    expect(row?.occurredAt.toISOString()).toBe("2026-05-10T10:00:00.000Z");
  });
});
