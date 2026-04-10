import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";
import { BillingPlanSchema, PLAN_LIMITS, type BillingPlan } from "@/lib/billing";
import { organizations, subscriptions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

const billingMetadataSchema = z.object({
  organizationId: z.string().min(1),
  plan: BillingPlanSchema,
});

// Matches the metadata written to Stripe subscriptions in handleCheckoutSessionCompleted.
const subscriptionMetadataSchema = z.object({
  organizationId: z.string().min(1),
});

function normalizeStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): string {
  if (status === "active" || status === "trialing") {
    return "active";
  }
  if (status === "canceled") {
    return "canceled";
  }
  return status;
}

function unixSecondsToDate(seconds: number | undefined | null): Date | null {
  if (seconds == null || Number.isNaN(seconds)) {
    return null;
  }
  return new Date(seconds * 1000);
}

async function upsertSubscriptionFromCheckout(payload: {
  organizationId: string;
  plan: BillingPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  await db
    .insert(subscriptions)
    .values({
      organizationId: payload.organizationId,
      stripeCustomerId: payload.stripeCustomerId,
      stripeSubscriptionId: payload.stripeSubscriptionId,
      plan: payload.plan,
      subAccountLimit: PLAN_LIMITS[payload.plan],
      status: payload.status,
      currentPeriodEnd: payload.currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.organizationId,
      set: {
        stripeCustomerId: payload.stripeCustomerId,
        stripeSubscriptionId: payload.stripeSubscriptionId,
        plan: payload.plan,
        subAccountLimit: PLAN_LIMITS[payload.plan],
        status: payload.status,
        currentPeriodEnd: payload.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<NextResponse> {
  const meta = billingMetadataSchema.safeParse(session.metadata ?? {});
  if (!meta.success) {
    return NextResponse.json({ error: "Invalid checkout metadata" }, { status: 400 });
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, meta.data.organizationId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 400 });
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    return NextResponse.json(
      { error: "Missing customer or subscription on session" },
      { status: 400 },
    );
  }

  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

  // Propagate organizationId to subscription metadata so future subscription
  // events (updated/deleted) can filter the DB lookup by organizationId directly.
  if (stripeSub.metadata?.organizationId !== meta.data.organizationId) {
    await stripe.subscriptions.update(stripeSub.id, {
      metadata: {
        ...stripeSub.metadata,
        organizationId: meta.data.organizationId,
        plan: meta.data.plan,
      },
    });
  }

  await upsertSubscriptionFromCheckout({
    organizationId: meta.data.organizationId,
    plan: meta.data.plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSub.id,
    status: normalizeStripeSubscriptionStatus(stripeSub.status),
    currentPeriodEnd: unixSecondsToDate(stripeSub.current_period_end),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<NextResponse> {
  const meta = subscriptionMetadataSchema.safeParse(subscription.metadata ?? {});
  if (!meta.success) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const [row] = await db
    .select({
      organizationId: subscriptions.organizationId,
      plan: subscriptions.plan,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, meta.data.organizationId),
        eq(subscriptions.stripeSubscriptionId, subscription.id),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const metaPlan = BillingPlanSchema.safeParse(subscription.metadata?.plan);
  const rowPlan = BillingPlanSchema.safeParse(row.plan);
  const plan: BillingPlan | null = metaPlan.success
    ? metaPlan.data
    : rowPlan.success
      ? rowPlan.data
      : null;

  const status = normalizeStripeSubscriptionStatus(subscription.status);
  const currentPeriodEnd = unixSecondsToDate(subscription.current_period_end);
  const updatedAt = new Date();

  if (plan) {
    await db
      .update(subscriptions)
      .set({
        plan,
        subAccountLimit: PLAN_LIMITS[plan],
        status,
        currentPeriodEnd,
        updatedAt,
      })
      .where(
        and(
          eq(subscriptions.organizationId, row.organizationId),
          eq(subscriptions.stripeSubscriptionId, subscription.id),
        ),
      );
  } else {
    await db
      .update(subscriptions)
      .set({
        status,
        currentPeriodEnd,
        updatedAt,
      })
      .where(
        and(
          eq(subscriptions.organizationId, row.organizationId),
          eq(subscriptions.stripeSubscriptionId, subscription.id),
        ),
      );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<NextResponse> {
  const meta = subscriptionMetadataSchema.safeParse(subscription.metadata ?? {});
  if (!meta.success) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const [row] = await db
    .select({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, meta.data.organizationId),
        eq(subscriptions.stripeSubscriptionId, subscription.id),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.organizationId, row.organizationId),
        eq(subscriptions.stripeSubscriptionId, subscription.id),
      ),
    );

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Stripe.webhooks.constructEvent requires the raw body string. Never use request.json()
  // here — parsing would alter the payload and break signature verification.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripe.webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      return handleCheckoutSessionCompleted(event.data.object);
    }
    case "customer.subscription.updated": {
      return handleSubscriptionUpdated(event.data.object);
    }
    case "customer.subscription.deleted": {
      return handleSubscriptionDeleted(event.data.object);
    }
    default:
      return NextResponse.json({ ok: true }, { status: 200 });
  }
}
