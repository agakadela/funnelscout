import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getCachedAuthSession } from "@/lib/auth-session";
import { getSubscriptionForOrg } from "@/lib/db/subscriptions";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { ensureAppOrganizationForBetterAuthOrg } from "@/lib/workspace-org";

export async function POST() {
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

  const ensured = await ensureAppOrganizationForBetterAuthOrg({
    betterAuthOrganizationId,
  });
  if (!ensured.ok) {
    return NextResponse.json(
      { error: "Could not resolve workspace" },
      { status: 503 },
    );
  }

  const sub = await getSubscriptionForOrg(ensured.id);
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 404 },
    );
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.auth.url.replace(/\/$/, "")}/billing`,
    });

    if (!portalSession.url) {
      return NextResponse.json(
        { error: "Failed to create billing portal session. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(portalSession.url, 302);
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Failed to create billing portal session. Please try again." },
      { status: 500 },
    );
  }
}
