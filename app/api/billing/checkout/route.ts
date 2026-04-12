import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { BillingPlanSchema } from "@/lib/billing";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { ensureAppOrganizationForBetterAuthOrg } from "@/lib/workspace-org";

const CheckoutBodySchema = z.object({
  plan: BillingPlanSchema,
});

const PLAN_LABEL: Record<z.infer<typeof BillingPlanSchema>, string> = {
  starter: "FunnelScout Starter",
  agency: "FunnelScout Agency",
  pro: "FunnelScout Pro",
};

const PLAN_AMOUNT_CENTS: Record<z.infer<typeof BillingPlanSchema>, number> = {
  starter: 4900,
  agency: 9900,
  pro: 19900,
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const betterAuthOrganizationId = session.session.activeOrganizationId;
  if (!betterAuthOrganizationId) {
    return NextResponse.json(
      { error: "No active organization selected" },
      { status: 400 },
    );
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = CheckoutBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plan = parsed.data.plan;
  const { id: organizationId } = await ensureAppOrganizationForBetterAuthOrg({
    betterAuthOrganizationId,
  });

  const origin = new URL(env.auth.url).origin;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${origin}/dashboard`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: organizationId,
    metadata: {
      organizationId,
      plan,
    },
    subscription_data: {
      metadata: {
        organizationId,
        plan,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PLAN_AMOUNT_CENTS[plan],
          recurring: { interval: "month" },
          product_data: {
            name: PLAN_LABEL[plan],
          },
        },
      },
    ],
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: checkoutSession.url });
}
