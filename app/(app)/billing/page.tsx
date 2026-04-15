import Link from "next/link";
import { redirect } from "next/navigation";

import { BillingEmptyPlans } from "@/components/dashboard/BillingEmptyPlans";
import { BillingManageSubscriptionForm } from "@/components/dashboard/BillingManageSubscriptionForm";
import { BillingSuccessBanner } from "@/components/dashboard/BillingSuccessBanner";
import { getCachedAuthSession } from "@/lib/auth-session";
import { countActiveSubAccountsForOrg } from "@/lib/billing";
import { formatBillingPlanLabel, PLAN_LIMITS } from "@/lib/billing-plans";
import { getSubscriptionForOrg } from "@/lib/db/subscriptions";
import { ensureAppOrganizationForBetterAuthOrg } from "@/lib/workspace-org";

function formatStatusLabel(status: string): string {
  if (status.length === 0) {
    return status;
  }
  return `${status[0]?.toUpperCase() ?? ""}${status.slice(1)}`;
}

function formatPeriodEnd(date: Date | null): string {
  if (!date) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type BillingPageProps = {
  searchParams: Promise<{ success?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await getCachedAuthSession();
  const betterAuthOrganizationId = session?.session?.activeOrganizationId;
  if (!betterAuthOrganizationId) {
    redirect("/sign-up");
  }

  const ensured = await ensureAppOrganizationForBetterAuthOrg({
    betterAuthOrganizationId,
  });
  if (!ensured.ok) {
    return (
      <div className="px-8 py-10">
        <header className="fs-page-header">
          <div>
            <p className="fs-breadcrumb">Overview /</p>
            <h1 className="fs-page-title text-fs-primary">Billing</h1>
          </div>
        </header>
        <div className="fs-card mt-6 p-8">
          <p className="fs-text-body text-fs-red" role="alert">
            Workspace could not be loaded. Try again or contact support.
          </p>
        </div>
      </div>
    );
  }

  const organizationId = ensured.id;
  const sub = await getSubscriptionForOrg(organizationId);
  const activeCount = await countActiveSubAccountsForOrg(organizationId);
  const sp = await searchParams;
  const showSuccessBanner = sp.success === "true";

  const isProTier = sub !== null && sub.subAccountLimit >= PLAN_LIMITS.pro;
  const usagePercent =
    sub !== null && sub.subAccountLimit > 0 && !isProTier
      ? Math.min(100, Math.round((activeCount / sub.subAccountLimit) * 100))
      : 0;

  return (
    <div className="px-8 py-10">
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview /</p>
          <h1 className="fs-page-title text-fs-primary">Billing</h1>
          <p className="fs-breadcrumb">
            Manage your subscription and usage limits.
          </p>
        </div>
      </header>

      {showSuccessBanner ? <BillingSuccessBanner /> : null}

      <div className="fs-card mt-6 p-8">
        {sub === null ? (
          <>
            <h2 className="fs-text-body mb-2 font-semibold text-fs-primary">
              No active subscription
            </h2>
            <BillingEmptyPlans />
          </>
        ) : sub.status === "canceled" ? (
          <div className="max-w-xl">
            <h2 className="fs-text-body mb-2 font-semibold text-fs-primary">
              Plan: {formatBillingPlanLabel(sub.plan)}{" "}
              <span className="text-fs-secondary">(Canceled)</span>
            </h2>
            <p className="fs-text-small mb-4 text-fs-secondary">
              Access until:{" "}
              <span className="font-mono text-fs-primary">
                {formatPeriodEnd(sub.currentPeriodEnd)}
              </span>
            </p>
            <p className="fs-text-body mb-6 text-fs-muted">
              Your subscription has been canceled. You retain access until the
              end of the current billing period.
            </p>
            <Link
              href="/pricing"
              className="fs-btn-primary inline-block px-5 py-2.5"
            >
              Resubscribe
            </Link>
          </div>
        ) : (
          <div className="max-w-xl">
            <h2 className="fs-text-body mb-2 font-semibold text-fs-primary">
              Current plan: {formatBillingPlanLabel(sub.plan)}
            </h2>
            <p className="fs-text-small mb-1 text-fs-secondary">
              Status:{" "}
              <span className="font-mono text-fs-primary">
                {formatStatusLabel(sub.status)}
              </span>
            </p>
            <p className="fs-text-small mb-6 text-fs-secondary">
              Renews:{" "}
              <span className="font-mono text-fs-primary">
                {formatPeriodEnd(sub.currentPeriodEnd)}
              </span>
            </p>

            {isProTier ? (
              <p className="fs-text-small mb-6 text-fs-secondary">
                Unlimited sub-accounts
                <span className="mt-1 block font-mono text-fs-primary">
                  {activeCount} sub-accounts
                </span>
              </p>
            ) : (
              <div className="mb-6">
                <p className="fs-label mb-2 text-fs-faded">Sub-accounts</p>
                <p className="fs-text-small mb-2 font-mono text-fs-primary">
                  {activeCount} / {sub.subAccountLimit} used
                </p>
                <svg
                  className="h-2 w-full max-w-md"
                  viewBox="0 0 100 2"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <rect
                    x="0"
                    y="0"
                    width="100"
                    height="2"
                    rx="1"
                    className="fill-fs-surface-2"
                  />
                  <rect
                    x="0"
                    y="0"
                    width={usagePercent}
                    height="2"
                    rx="1"
                    className="fill-fs-green"
                  />
                </svg>
                <p className="fs-text-caption mt-1 text-fs-faded">
                  {usagePercent}% of limit
                </p>
              </div>
            )}

            {sub.stripeCustomerId ? <BillingManageSubscriptionForm /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
