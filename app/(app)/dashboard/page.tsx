import { redirect } from "next/navigation";

import {
  AgencyOverview,
  AgencyOverviewStatRow,
} from "@/components/dashboard/AgencyOverview";
import { NoGhlConnectPanel } from "@/components/dashboard/NoGhlConnectPanel";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { getCachedAuthSession } from "@/lib/auth-session";
import { loadAgencyOverviewData } from "@/lib/dashboard/load-agency-overview";

export default async function DashboardPage() {
  const session = await getCachedAuthSession();
  if (!session?.session) {
    redirect("/sign-in");
  }
  const activeOrganizationId = session.session.activeOrganizationId;
  if (!activeOrganizationId) {
    redirect("/create-workspace");
  }

  const data = await loadAgencyOverviewData({
    betterAuthOrganizationId: activeOrganizationId,
  });

  const runId = data.kind === "ready" ? data.runAnalysisSubAccountId : null;

  const lastLine =
    data.kind === "ready" || data.kind === "no_clients"
      ? data.lastCompletedAnalysisLabel
      : null;

  return (
    <>
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview</p>
          <h1 className="fs-page-title text-fs-primary">Agency overview</h1>
          {data.kind !== "no_ghl" ? (
            <p className="fs-breadcrumb">
              {lastLine
                ? `Last analysis: ${lastLine}`
                : "No completed analyses yet"}
            </p>
          ) : null}
        </div>
        <RunAnalysisButton
          subAccountId={runId}
          disabled={data.kind !== "ready" || !runId}
        />
      </header>
      {data.kind === "ready" || data.kind === "no_clients" ? (
        <AgencyOverviewStatRow data={data} />
      ) : null}
      {data.kind === "no_ghl" ? (
        <NoGhlConnectPanel />
      ) : (
        <div className="px-8 pb-8 pt-6">
          <AgencyOverview data={data} />
        </div>
      )}
    </>
  );
}
