import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AccountDrilldown } from "@/components/dashboard/AccountDrilldown";
import { HealthScoreBadge } from "@/components/dashboard/HealthScoreBadge";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { auth } from "@/lib/auth";
import { loadAccountDrilldownData } from "@/lib/dashboard/load-account-drilldown";

type AccountPageProps = {
  params: Promise<{ locationId: string }>;
};

export default async function AccountPage({ params }: AccountPageProps) {
  const { locationId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.session) {
    redirect("/sign-in");
  }
  const activeOrganizationId = session.session.activeOrganizationId;
  if (!activeOrganizationId) {
    redirect("/sign-up");
  }

  const drilldown = await loadAccountDrilldownData({
    betterAuthOrganizationId: activeOrganizationId,
    ghlLocationId: locationId,
  });

  return (
    <>
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview / Accounts /</p>
          {drilldown.kind === "ok" ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  className="text-fs-primary"
                  style={{
                    fontSize: "var(--font-size-heading)",
                    fontWeight: 700,
                  }}
                >
                  {drilldown.name}
                </h1>
                <HealthScoreBadge
                  score={drilldown.healthScore}
                  tier={drilldown.healthTier}
                />
              </div>
              {drilldown.lastRunLabel ? (
                <p className="fs-breadcrumb">
                  Last analysis: {drilldown.lastRunLabel}
                </p>
              ) : (
                <p className="fs-breadcrumb">No completed analysis yet</p>
              )}
            </>
          ) : (
            <h1
              className="text-fs-primary"
              style={{ fontSize: "var(--font-size-heading)", fontWeight: 700 }}
            >
              Account
            </h1>
          )}
        </div>
        {drilldown.kind === "ok" ? (
          <RunAnalysisButton subAccountId={drilldown.subAccountId} />
        ) : null}
      </header>
      <div className="px-8 pb-8 pt-6">
        <AccountDrilldown drilldown={drilldown} />
      </div>
    </>
  );
}
