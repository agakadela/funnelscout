"use client";

import { useState } from "react";

import type { BillingPlan } from "@/lib/billing-plans";
import { PLAN_LIMITS, planPriceDisplayUsd } from "@/lib/billing-plans";
import { isStripeHostedCheckoutUrl } from "@/lib/stripe-checkout-url";

const TIERS: Array<{
  plan: BillingPlan;
  name: string;
  blurb: string;
}> = [
  {
    plan: "starter",
    name: "Starter",
    blurb: "Connect GHL",
  },
  {
    plan: "agency",
    name: "Agency",
    blurb: "Manage multiple clients",
  },
  {
    plan: "pro",
    name: "Pro",
    blurb: "Scale your roster",
  },
];

export function BillingEmptyPlans() {
  const [error, setError] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);

  async function checkout(plan: BillingPlan) {
    setError(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Checkout failed";
        setError(msg);
        setLoadingPlan(null);
        return;
      }
      if (
        body &&
        typeof body === "object" &&
        "url" in body &&
        typeof (body as { url: unknown }).url === "string"
      ) {
        const url = (body as { url: string }).url;
        if (!isStripeHostedCheckoutUrl(url)) {
          setError("Invalid checkout URL");
          setLoadingPlan(null);
          return;
        }
        setLoadingPlan(null);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.rel = "noopener noreferrer";
        anchor.click();
        return;
      }
      setError("No checkout URL returned");
      setLoadingPlan(null);
    } catch {
      setError("Network error");
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <p className="fs-text-body mb-6 text-fs-secondary">
        Choose a plan to get started:
      </p>
      {error ? (
        <p className="fs-text-small mb-6 text-fs-red" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.plan}
            className="fs-card flex flex-col rounded-card border border-fs-border p-5"
          >
            <p className="fs-label mb-2 text-fs-amber">{tier.name}</p>
            <div className="fs-pricing-amount mb-1 font-mono text-fs-primary">
              {planPriceDisplayUsd(tier.plan)}
              <span className="fs-text-small font-normal text-fs-secondary">
                {" "}
                /mo
              </span>
            </div>
            <p className="fs-text-small mb-4 text-fs-secondary">{tier.blurb}</p>
            <p className="fs-text-caption mb-4 text-fs-faded">
              {tier.plan === "pro"
                ? "Unlimited sub-accounts"
                : `Up to ${PLAN_LIMITS[tier.plan]} sub-accounts`}
            </p>
            <button
              type="button"
              className="fs-btn-primary mt-auto w-full py-2.5"
              disabled={loadingPlan !== null}
              onClick={() => void checkout(tier.plan)}
            >
              {loadingPlan === tier.plan ? "Redirecting…" : "Get started"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
