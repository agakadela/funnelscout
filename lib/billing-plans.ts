import { z } from "zod";

// pro uses 999 as a practical "unlimited" sentinel; the DB column is integer
// so Infinity cannot be stored.
export const PLAN_LIMITS = {
  starter: 5,
  agency: 15,
  pro: 999,
} as const;

export type BillingPlan = keyof typeof PLAN_LIMITS;

export const BillingPlanSchema = z.enum(["starter", "agency", "pro"]);

const PLAN_DISPLAY_NAME: Record<BillingPlan, string> = {
  starter: "Starter",
  agency: "Agency",
  pro: "Pro",
};

export function formatBillingPlanLabel(plan: string): string {
  const parsed = BillingPlanSchema.safeParse(plan);
  return parsed.success
    ? PLAN_DISPLAY_NAME[parsed.data]
    : plan.length > 0
      ? `${plan[0]?.toUpperCase() ?? ""}${plan.slice(1)}`
      : plan;
}

export const PLAN_CHECKOUT_AMOUNT_USD_CENTS: Record<BillingPlan, number> = {
  starter: 4900,
  agency: 9900,
  pro: 19900,
};

export const PLAN_CHECKOUT_PRODUCT_LABEL: Record<BillingPlan, string> = {
  starter: "FunnelScout Starter",
  agency: "FunnelScout Agency",
  pro: "FunnelScout Pro",
};

export function planPriceDisplayUsd(plan: BillingPlan): string {
  const cents = PLAN_CHECKOUT_AMOUNT_USD_CENTS[plan];
  if (cents % 100 === 0) {
    return `$${cents / 100}`;
  }
  return `$${(cents / 100).toFixed(2)}`;
}
