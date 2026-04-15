import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  BillingPlanSchema,
  PLAN_CHECKOUT_AMOUNT_USD_CENTS,
  PLAN_CHECKOUT_PRODUCT_LABEL,
} from "@/lib/billing";
import { getCachedAuthSession } from "@/lib/auth-session";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { ensureAppOrganizationForBetterAuthOrg } from "@/lib/workspace-org";

const CheckoutBodySchema = z.object({
  plan: BillingPlanSchema,
});

export async function POST(req: Request) {
  const session = await getCachedAuthSession();

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
  const ensured = await ensureAppOrganizationForBetterAuthOrg({
    betterAuthOrganizationId,
  });
  if (!ensured.ok) {
    return NextResponse.json(
      { error: "Could not prepare workspace for checkout" },
      { status: 503 },
    );
  }
  const organizationId = ensured.id;

  const origin = new URL(env.auth.url).origin;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${origin}/billing?success=true`,
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
            unit_amount: PLAN_CHECKOUT_AMOUNT_USD_CENTS[plan],
            recurring: { interval: "month" },
            product_data: {
              name: PLAN_CHECKOUT_PRODUCT_LABEL[plan],
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
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 },
    );
  }
}
