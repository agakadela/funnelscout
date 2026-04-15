import { hashPassword } from "better-auth/crypto";
import {
  CLAUDE_SONNET_MODEL,
  COST_LOG_STEPS,
  type CostLogStep,
} from "@/lib/ai/types";
import { calculateCost, formatCostUsd } from "@/lib/ai/cost";
import {
  account,
  member,
  organization as betterAuthOrganization,
  user,
} from "@/drizzle/better-auth-schema";
import {
  analyses,
  costLogs,
  opportunityEvents,
  organizations,
  subAccounts,
  subscriptions,
} from "@/drizzle/schema";
import { buildPipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import { closeDatabaseConnection, db } from "@/lib/db";
import { encryptGhlToken } from "@/lib/ghl/oauth";
import {
  SEED_ANALYSIS_PERIOD_END_UTC,
  SEED_ANALYSIS_PERIOD_START_UTC,
  SEED_HISTORY_END_UTC,
  SEED_HISTORY_START_UTC,
  SEED_PIPELINE_ID,
  SEED_SUB_ACCOUNTS_PER_ORG,
  buildSeedDemoAnalysisReportJson,
  buildSeedLogicalOpportunityEventsForSubAccount,
  filterMetricRowsForPeriod,
  logicalEventsToMetricRows,
  seedGhlContactId,
} from "@/lib/seed/demo-data";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const OPPORTUNITY_EVENTS_INSERT_CHUNK = 200;

const SEED_AGENCY_NAMES = [
  "Seed Agency Aurora",
  "Seed Agency Borealis",
  "Seed Agency Compass",
] as const;

const SEED_TOKEN_PLACEHOLDER = "seed-token-not-for-production";

/** Shared password for all seed demo users (dev / local only). */
const SEED_OWNER_PASSWORD = "SeedPass123!";

function costLogTokensForStep(step: CostLogStep): {
  inputTokens: number;
  outputTokens: number;
} {
  switch (step) {
    case "metrics":
      return { inputTokens: 2100, outputTokens: 620 };
    case "anomaly":
      return { inputTokens: 3400, outputTokens: 980 };
    case "recommendations":
      return { inputTokens: 4100, outputTokens: 1200 };
  }
}

async function main(): Promise<void> {
  const access = encryptGhlToken(`${SEED_TOKEN_PLACEHOLDER}-access`);
  const refresh = encryptGhlToken(`${SEED_TOKEN_PLACEHOLDER}-refresh`);
  const expiresAt = new Date(SEED_HISTORY_END_UTC.getTime() + 86_400_000 * 30);
  const reportJson = buildSeedDemoAnalysisReportJson();
  const credentialPasswordHash = await hashPassword(SEED_OWNER_PASSWORD);
  const authStamp = SEED_HISTORY_START_UTC;

  for (let orgIndex = 0; orgIndex < 3; orgIndex++) {
    const orgNum = orgIndex + 1;
    const baId = `seed_bauth_org_${pad2(orgNum)}`;
    const slug = `funnelscout-seed-agency-${pad2(orgNum)}`;
    const workspaceId = `seed_workspace_${pad2(orgNum)}`;
    const agencyName = SEED_AGENCY_NAMES[orgIndex] ?? SEED_AGENCY_NAMES[0];
    const ownerUserId = `seed_user_${pad2(orgNum)}`;
    const ownerEmail = `seed.owner.${pad2(orgNum)}@funnelscout.local`;
    const ownerAccountId = `seed_account_${pad2(orgNum)}`;
    const ownerMemberId = `seed_member_${pad2(orgNum)}`;

    await db
      .insert(betterAuthOrganization)
      .values({
        id: baId,
        name: agencyName,
        slug,
        createdAt: SEED_HISTORY_START_UTC,
      })
      .onConflictDoNothing({ target: betterAuthOrganization.id });

    await db
      .insert(user)
      .values({
        id: ownerUserId,
        name: `${agencyName} owner`,
        email: ownerEmail,
        emailVerified: true,
        image: null,
        createdAt: authStamp,
        updatedAt: authStamp,
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          emailVerified: true,
          updatedAt: new Date(),
        },
      });

    await db
      .insert(account)
      .values({
        id: ownerAccountId,
        accountId: ownerUserId,
        providerId: "credential",
        userId: ownerUserId,
        password: credentialPasswordHash,
        createdAt: authStamp,
        updatedAt: authStamp,
      })
      .onConflictDoNothing({ target: account.id });

    await db
      .insert(member)
      .values({
        id: ownerMemberId,
        organizationId: baId,
        userId: ownerUserId,
        role: "owner",
        createdAt: authStamp,
      })
      .onConflictDoNothing({ target: member.id });

    await db
      .insert(organizations)
      .values({
        id: workspaceId,
        name: agencyName,
        betterAuthOrganizationId: baId,
        ghlAgencyId: `seed_ghl_agency_${pad2(orgNum)}`,
        ghlAccessToken: access,
        ghlRefreshToken: refresh,
        ghlTokenExpiresAt: expiresAt,
      })
      .onConflictDoNothing({ target: organizations.id });

    await db
      .insert(subscriptions)
      .values({
        id: `seed_subscription_${pad2(orgNum)}`,
        organizationId: workspaceId,
        stripeCustomerId: `seed_stripe_cus_${pad2(orgNum)}`,
        stripeSubscriptionId: `seed_stripe_sub_${pad2(orgNum)}`,
        plan: "agency",
        subAccountLimit: 999,
        status: "active",
        currentPeriodEnd: expiresAt,
      })
      .onConflictDoNothing({ target: subscriptions.id });

    const subCount = SEED_SUB_ACCOUNTS_PER_ORG[orgIndex] ?? 3;

    for (let subIndex = 0; subIndex < subCount; subIndex++) {
      const subNum = subIndex + 1;
      const subId = `seed_sub_${pad2(orgNum)}_${pad2(subNum)}`;
      const locId = `seed_loc_${pad2(orgNum)}_${pad2(subNum)}`;
      const clientName = `Seed Client ${pad2(orgNum)}-${pad2(subNum)}`;

      await db
        .insert(subAccounts)
        .values({
          id: subId,
          organizationId: workspaceId,
          ghlLocationId: locId,
          name: clientName,
          isActive: true,
        })
        .onConflictDoNothing({ target: subAccounts.id });

      const logical = buildSeedLogicalOpportunityEventsForSubAccount({
        orgIndex,
        subIndex,
        windowStart: SEED_HISTORY_START_UTC,
        windowEnd: SEED_HISTORY_END_UTC,
      });

      let contactSeq = 0;
      for (
        let chunkStart = 0;
        chunkStart < logical.length;
        chunkStart += OPPORTUNITY_EVENTS_INSERT_CHUNK
      ) {
        const slice = logical.slice(
          chunkStart,
          chunkStart + OPPORTUNITY_EVENTS_INSERT_CHUNK,
        );
        const rows = slice.map((ev, idx) => ({
          id: `seed_opp_evt_${ev.ghlEventId}`,
          subAccountId: subId,
          ghlOpportunityId: ev.ghlOpportunityId,
          ghlEventId: ev.ghlEventId,
          ghlContactId: seedGhlContactId(orgIndex, subIndex, contactSeq + idx),
          ghlPipelineId: SEED_PIPELINE_ID,
          ghlPipelineStageId: ev.ghlPipelineStageId,
          eventType: ev.eventType,
          monetaryValue: ev.monetaryValue,
          status: ev.status,
          rawPayload: { seed: true, v: 1 },
          occurredAt: ev.occurredAt,
        }));
        contactSeq += slice.length;
        if (rows.length > 0) {
          await db
            .insert(opportunityEvents)
            .values(rows)
            .onConflictDoNothing({ target: opportunityEvents.id });
        }
      }

      const metricsRows = filterMetricRowsForPeriod(
        logicalEventsToMetricRows(logical),
        SEED_ANALYSIS_PERIOD_START_UTC,
        SEED_ANALYSIS_PERIOD_END_UTC,
      );
      const metricsJson = buildPipelineMetricsSnapshot({
        periodStart: SEED_ANALYSIS_PERIOD_START_UTC,
        periodEnd: SEED_ANALYSIS_PERIOD_END_UTC,
        subAccountId: subId,
        rows: metricsRows,
      });

      const analysisId = `seed_analysis_${pad2(orgNum)}_${pad2(subNum)}`;

      await db
        .insert(analyses)
        .values({
          id: analysisId,
          organizationId: workspaceId,
          subAccountId: subId,
          triggeredBy: "scheduled",
          status: "completed",
          periodStart: SEED_ANALYSIS_PERIOD_START_UTC,
          periodEnd: SEED_ANALYSIS_PERIOD_END_UTC,
          metricsJson,
          reportJson,
          completedAt: SEED_ANALYSIS_PERIOD_END_UTC,
        })
        .onConflictDoNothing({ target: analyses.id });

      const costLogRows = COST_LOG_STEPS.map((step) => {
        const { inputTokens, outputTokens } = costLogTokensForStep(step);
        const costUsd = calculateCost(
          CLAUDE_SONNET_MODEL,
          inputTokens,
          outputTokens,
        );
        return {
          id: `seed_cost_${pad2(orgNum)}_${pad2(subNum)}_${step}`,
          analysisId,
          model: CLAUDE_SONNET_MODEL,
          step,
          inputTokens,
          outputTokens,
          costUsd: formatCostUsd(costUsd),
          triggeredBy: "scheduled" as const,
        };
      });
      await db
        .insert(costLogs)
        .values(costLogRows)
        .onConflictDoNothing({ target: costLogs.id });
    }
  }
}

void (async (): Promise<void> => {
  try {
    await main();
    console.info(
      "Seed completed (idempotent — skipped rows that already exist by primary key).",
    );
    console.info(
      [
        "Seed users (sign in with email + password):",
        "  seed.owner.01@funnelscout.local / seed.owner.02@funnelscout.local / seed.owner.03@funnelscout.local",
        `  password: ${SEED_OWNER_PASSWORD}`,
        "Each account is owner of one demo agency (BetterAuth org ↔ workspace already linked).",
      ].join("\n"),
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
})();
