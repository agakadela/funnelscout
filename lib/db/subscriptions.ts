import { eq } from "drizzle-orm";

import { subscriptions } from "@/drizzle/schema";
import { db } from "@/lib/db";

export async function getSubscriptionForOrg(organizationId: string) {
  const [row] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      subAccountLimit: subscriptions.subAccountLimit,
      stripeCustomerId: subscriptions.stripeCustomerId,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}
