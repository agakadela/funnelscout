import { eq } from "drizzle-orm";

import { organizations, subscriptions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { VISUAL_SEED_WORKSPACE } from "../constants";

const FAR_FUTURE = new Date("2030-06-01T00:00:00.000Z");
const PAST = new Date("2000-01-01T00:00:00.000Z");
const RENEW_DATE_STARTER = new Date("2026-12-31T00:00:00.000Z");
const RENEW_DATE_PRO = new Date("2027-06-30T00:00:00.000Z");

/**
 * Aligns seed workspaces with the visual regression matrix. Every mutation is
 * scoped by `organizationId` / workspace id (same as production queries).
 */
export async function applyVisualDbFixtures(): Promise<void> {
  await db
    .update(organizations)
    .set({ ghlTokenExpiresAt: FAR_FUTURE })
    .where(eq(organizations.id, VISUAL_SEED_WORKSPACE.org1));

  await db
    .update(subscriptions)
    .set({
      plan: "starter",
      subAccountLimit: 5,
      status: "active",
      currentPeriodEnd: RENEW_DATE_STARTER,
    })
    .where(eq(subscriptions.organizationId, VISUAL_SEED_WORKSPACE.org1));

  await db
    .update(organizations)
    .set({ ghlTokenExpiresAt: PAST })
    .where(eq(organizations.id, VISUAL_SEED_WORKSPACE.org2));

  await db
    .delete(subscriptions)
    .where(eq(subscriptions.organizationId, VISUAL_SEED_WORKSPACE.org3));
}

export async function applyProSubscriptionForOrg1(): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      plan: "pro",
      subAccountLimit: 999,
      status: "active",
      currentPeriodEnd: RENEW_DATE_PRO,
    })
    .where(eq(subscriptions.organizationId, VISUAL_SEED_WORKSPACE.org1));
}
