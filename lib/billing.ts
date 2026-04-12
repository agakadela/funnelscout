import { and, count, eq } from "drizzle-orm";

import { subAccounts, subscriptions } from "@/drizzle/schema";
import { db } from "@/lib/db";

export {
  BillingPlanSchema,
  type BillingPlan,
  PLAN_CHECKOUT_AMOUNT_USD_CENTS,
  PLAN_CHECKOUT_PRODUCT_LABEL,
  PLAN_LIMITS,
  planPriceDisplayUsd,
} from "@/lib/billing-plans";

export type PlanLimitEvaluationInput = {
  subscription: {
    status: string;
    subAccountLimit: number;
  } | null;
  activeSubAccountCount: number;
};

export type PlanLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "no_subscription" | "subscription_inactive" | "limit_reached";
    };

export function evaluatePlanLimit(
  input: PlanLimitEvaluationInput,
): PlanLimitResult {
  if (input.subscription === null) {
    return { allowed: false, reason: "no_subscription" };
  }
  if (input.subscription.status !== "active") {
    return { allowed: false, reason: "subscription_inactive" };
  }
  if (input.activeSubAccountCount >= input.subscription.subAccountLimit) {
    return { allowed: false, reason: "limit_reached" };
  }
  return { allowed: true };
}

export async function countActiveSubAccountsForOrg(
  organizationId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(subAccounts)
    .where(
      and(
        eq(subAccounts.organizationId, organizationId),
        eq(subAccounts.isActive, true),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function checkPlanLimit(
  organizationId: string,
): Promise<PlanLimitResult> {
  const [subRow] = await db
    .select({
      status: subscriptions.status,
      subAccountLimit: subscriptions.subAccountLimit,
    })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  const subscription = subRow
    ? { status: subRow.status, subAccountLimit: subRow.subAccountLimit }
    : null;

  const activeSubAccountCount =
    await countActiveSubAccountsForOrg(organizationId);

  return evaluatePlanLimit({ subscription, activeSubAccountCount });
}
