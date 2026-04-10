import { z } from "zod";

export const OpportunityCreateEventSchema = z.object({
  type: z.literal("OpportunityCreate"),
  locationId: z.string(),
  data: z.object({
    id: z.string(),
    contactId: z.string(),
    pipelineId: z.string(),
    pipelineStageId: z.string(),
    monetaryValue: z.number(),
    status: z.enum(["open", "won", "lost", "abandoned"]),
    createdAt: z.string(),
  }),
});

export const OpportunityStageUpdateEventSchema = z.object({
  type: z.literal("OpportunityStageUpdate"),
  locationId: z.string(),
  data: z.object({
    id: z.string(),
    contactId: z.string(),
    pipelineId: z.string(),
    pipelineStageId: z.string(),
    monetaryValue: z.number(),
    status: z.enum(["open", "won", "lost", "abandoned"]),
    updatedAt: z.string(),
  }),
});

export const OpportunityStatusUpdateEventSchema = z.object({
  type: z.literal("OpportunityStatusUpdate"),
  locationId: z.string(),
  data: z.object({
    id: z.string(),
    contactId: z.string(),
    status: z.enum(["open", "won", "lost", "abandoned"]),
    updatedAt: z.string(),
  }),
});

export const OrderCreateEventSchema = z.object({
  type: z.literal("OrderCreate"),
  locationId: z.string(),
  data: z.object({
    id: z.string(),
    contactId: z.string(),
    totalPrice: z.number(),
    currency: z.string(),
    createdAt: z.string(),
  }),
});

export const GHLWebhookEventSchema = z.discriminatedUnion("type", [
  OpportunityCreateEventSchema,
  OpportunityStageUpdateEventSchema,
  OpportunityStatusUpdateEventSchema,
  OrderCreateEventSchema,
]);

export type OpportunityCreateEvent = z.infer<
  typeof OpportunityCreateEventSchema
>;
export type OpportunityStageUpdateEvent = z.infer<
  typeof OpportunityStageUpdateEventSchema
>;
export type OpportunityStatusUpdateEvent = z.infer<
  typeof OpportunityStatusUpdateEventSchema
>;
export type OrderCreateEvent = z.infer<typeof OrderCreateEventSchema>;
export type GHLWebhookEvent = z.infer<typeof GHLWebhookEventSchema>;

export const GhlOAuthTokenResponseSchema = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
    companyId: z.string().optional(),
    company_id: z.string().optional(),
    locationId: z.string().optional(),
    location_id: z.string().optional(),
    userType: z.string().optional(),
    user_type: z.string().optional(),
  })
  .transform((r) => ({
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresInSeconds: r.expires_in,
    companyId: r.companyId ?? r.company_id,
    locationId: r.locationId ?? r.location_id,
    userType: r.userType ?? r.user_type,
  }));

export type GhlOAuthTokenResponse = z.infer<typeof GhlOAuthTokenResponseSchema>;

const ghlOpportunityRecordSchema = z
  .object({
    id: z.string(),
    contactId: z.string().optional(),
    contact_id: z.string().optional(),
    pipelineId: z.string().optional(),
    pipeline_id: z.string().optional(),
    pipelineStageId: z.string().optional(),
    pipeline_stage_id: z.string().optional(),
    monetaryValue: z.number().optional(),
    monetary_value: z.number().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
    updatedAt: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const GhlOpportunitySearchResponseSchema = z
  .object({
    opportunities: z.array(ghlOpportunityRecordSchema).optional(),
  })
  .passthrough();

export type GhlOpportunityRecord = z.infer<typeof ghlOpportunityRecordSchema>;

const ghlLocationRecordSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
  })
  .passthrough();

export const GhlLocationSearchResponseSchema = z
  .object({
    locations: z.array(ghlLocationRecordSchema).optional(),
  })
  .passthrough();
