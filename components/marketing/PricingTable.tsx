"use client";

import { useState } from "react";

import type { BillingPlan } from "@/lib/billing-plans";
import { PLAN_LIMITS, planPriceDisplayUsd } from "@/lib/billing-plans";
import { isStripeHostedCheckoutUrl } from "@/lib/stripe-checkout-url";

const TIERS: Array<{
  plan: BillingPlan;
  name: string;
  description: string;
  features: string[];
  featured?: boolean;
}> = [
  {
    plan: "starter",
    name: "Starter",
    description: `Up to ${PLAN_LIMITS.starter} sub-accounts`,
    features: [
      "Weekly analysis for each sub-account",
      "Monday email digest",
      "Run an on-demand refresh anytime",
      "Cancel anytime",
    ],
  },
  {
    plan: "agency",
    name: "Agency",
    description: `Up to ${PLAN_LIMITS.agency} sub-accounts`,
    features: [
      "Weekly analysis for each sub-account",
      "Priority email digest",
      "Everything in Starter",
      "Simple upgrade as you add clients",
    ],
    featured: true,
  },
  {
    plan: "pro",
    name: "Pro",
    description: `Up to ${PLAN_LIMITS.pro} sub-accounts`,
    features: [
      "Weekly analysis for each sub-account",
      "Email digest and exports",
      "Everything in Agency",
      "Built for larger rosters and heavier usage",
    ],
  },
];

export function PricingTable() {
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
      {error ? (
        <p
          className="mb-6 text-center text-fs-red"
          style={{ fontSize: "var(--font-size-small)" }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="mx-auto grid max-w-[780px] gap-6 md:grid-cols-3 md:items-stretch md:gap-4">
        {TIERS.map((tier) => {
          const cardClass = tier.featured
            ? "fs-pricing-card fs-pricing-card-featured relative h-full rounded-card"
            : "fs-pricing-card h-full rounded-card";
          return (
            <div key={tier.plan} className={cardClass}>
              {tier.featured ? (
                <div
                  className="absolute z-10 rounded-b-md bg-fs-amber px-2.5 py-0.5"
                  style={{ top: "-1px", left: "24px" }}
                >
                  <span className="font-mono text-[10px] font-bold text-fs-bg">
                    MOST POPULAR
                  </span>
                </div>
              ) : null}
              <p
                className={`fs-label mb-3 ${tier.featured ? "text-fs-amber" : ""}`}
              >
                {tier.name}
              </p>
              <div
                className="mb-1 inline-flex items-baseline gap-1.5 font-mono text-fs-primary"
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  letterSpacing: "var(--tracking-tight)",
                }}
              >
                {planPriceDisplayUsd(tier.plan)}
                <span
                  className="font-normal text-fs-secondary"
                  style={{ fontSize: "var(--font-size-small)" }}
                >
                  /mo
                </span>
              </div>
              <p
                className="mb-6 text-fs-secondary"
                style={{
                  fontSize: "var(--font-size-small)",
                  lineHeight: 1.45,
                }}
              >
                {tier.description}
              </p>
              <ul className="mb-8 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="fs-pricing-feature">
                    <span
                      className={
                        tier.featured
                          ? "fs-pricing-stripe-amber"
                          : "fs-pricing-stripe"
                      }
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={
                  tier.featured
                    ? "fs-btn-primary mt-auto block w-full py-2.5 font-semibold"
                    : "mt-auto block w-full cursor-pointer rounded-md border border-fs-border bg-transparent py-2.5 text-center text-sm font-medium text-fs-secondary transition-colors hover:border-[#2d3f55] hover:text-fs-muted disabled:cursor-not-allowed disabled:opacity-40"
                }
                disabled={loadingPlan !== null}
                onClick={() => void checkout(tier.plan)}
              >
                {loadingPlan === tier.plan ? "Redirecting…" : "Get started"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
