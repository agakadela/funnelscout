import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  betterAuthOrganizationId: text("better_auth_organization_id").unique(),
  ghlAgencyId: text("ghl_agency_id").unique(),
  ghlAccessToken: text("ghl_access_token"),
  ghlRefreshToken: text("ghl_refresh_token"),
  ghlTokenExpiresAt: timestamp("ghl_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const subAccounts = pgTable(
  "sub_accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ghlLocationId: text("ghl_location_id").notNull().unique(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("sub_accounts_org_idx").on(t.organizationId)],
);

export const opportunityEvents = pgTable(
  "opportunity_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    subAccountId: text("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    ghlOpportunityId: text("ghl_opportunity_id").notNull(),
    ghlEventId: text("ghl_event_id"),
    ghlContactId: text("ghl_contact_id").notNull(),
    ghlPipelineId: text("ghl_pipeline_id").notNull(),
    ghlPipelineStageId: text("ghl_pipeline_stage_id").notNull(),
    eventType: text("event_type").notNull(),
    monetaryValue: numeric("monetary_value", { precision: 12, scale: 2 }),
    status: text("status"),
    rawPayload: jsonb("raw_payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("opp_events_sub_account_occurred_idx").on(
      t.subAccountId,
      t.occurredAt,
    ),
    index("opp_events_ghl_opp_idx").on(t.ghlOpportunityId),
    unique("opp_events_ghl_event_id_unique").on(t.ghlEventId),
    unique("opp_events_idempotency_fallback").on(
      t.ghlOpportunityId,
      t.eventType,
      t.ghlPipelineStageId,
    ),
  ],
);

export const analyses = pgTable(
  "analyses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subAccountId: text("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    triggeredBy: text("triggered_by").notNull(),
    status: text("status").default("pending").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    metricsJson: jsonb("metrics_json"),
    reportJson: jsonb("report_json"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("analyses_sub_account_created_idx").on(t.subAccountId, t.createdAt),
    index("analyses_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

export const costLogs = pgTable(
  "cost_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    analysisId: text("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    step: text("step").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    triggeredBy: text("triggered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("cost_logs_analysis_idx").on(t.analysisId)],
);

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" })
    .unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  plan: text("plan").notNull(),
  subAccountLimit: integer("sub_account_limit").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const organizationsRelations = relations(
  organizations,
  ({ many, one }) => ({
    subAccounts: many(subAccounts),
    analyses: many(analyses),
    subscription: one(subscriptions, {
      fields: [organizations.id],
      references: [subscriptions.organizationId],
    }),
  }),
);

export const subAccountsRelations = relations(subAccounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subAccounts.organizationId],
    references: [organizations.id],
  }),
  opportunityEvents: many(opportunityEvents),
  analyses: many(analyses),
}));

export const opportunityEventsRelations = relations(
  opportunityEvents,
  ({ one }) => ({
    subAccount: one(subAccounts, {
      fields: [opportunityEvents.subAccountId],
      references: [subAccounts.id],
    }),
  }),
);

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [analyses.organizationId],
    references: [organizations.id],
  }),
  subAccount: one(subAccounts, {
    fields: [analyses.subAccountId],
    references: [subAccounts.id],
  }),
  costLogs: many(costLogs),
}));

export const costLogsRelations = relations(costLogs, ({ one }) => ({
  analysis: one(analyses, {
    fields: [costLogs.analysisId],
    references: [analyses.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export * from "./better-auth-schema";
