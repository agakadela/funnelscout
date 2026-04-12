import Link from "next/link";

import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import type { AnalysisReport as AnalysisReportModel } from "@/lib/ai/types";
import { AnalysisReport } from "@/components/dashboard/AnalysisReport";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import type { AccountDrilldownData } from "@/lib/dashboard/load-account-drilldown";
import { formatUsdCompact } from "@/lib/dashboard/format";

function metricTiles(
  report: AnalysisReportModel | null,
  snapshot: PipelineMetricsSnapshot | null,
) {
  if (report && report.metrics.kpis.length > 0) {
    return report.metrics.kpis.slice(0, 4).map((kpi) => (
      <div key={kpi.label} className="fs-card p-4">
        <p className="fs-stat-label">{kpi.label}</p>
        <p className="fs-metric-sm">{kpi.value}</p>
      </div>
    ));
  }
  if (snapshot) {
    const won = snapshot.statusCounts["won"] ?? 0;
    const lost = snapshot.statusCounts["lost"] ?? 0;
    const closed = won + lost;
    const conv = closed === 0 ? "—" : `${Math.round((won / closed) * 100)}%`;
    return [
      {
        label: "Opportunities",
        value: String(snapshot.uniqueOpportunityCount),
      },
      { label: "Pipeline", value: formatUsdCompact(snapshot.sumMonetaryValue) },
      { label: "Events", value: String(snapshot.eventCount) },
      { label: "Win rate", value: conv },
    ].map((m) => (
      <div key={m.label} className="fs-card p-4">
        <p className="fs-stat-label">{m.label}</p>
        <p className="fs-metric-sm">{m.value}</p>
      </div>
    ));
  }
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="fs-card p-4">
          <p className="fs-stat-label">—</p>
          <p className="fs-metric-sm">—</p>
        </div>
      ))}
    </>
  );
}

function statusClass(status: string): string {
  if (status === "completed") return "fs-status-completed";
  if (status === "running" || status === "pending") return "fs-status-running";
  if (status === "failed") return "fs-status-failed";
  return "fs-status-running";
}

export function AccountDrilldown({
  drilldown,
}: {
  drilldown: AccountDrilldownData;
}) {
  if (drilldown.kind === "not_found") {
    return (
      <div className="fs-card p-8">
        <p className="font-medium text-fs-red">Account not found</p>
        <p className="fs-text-small mt-2 text-fs-secondary">
          This client is not in your workspace or the URL is invalid.
        </p>
        <Link
          href="/dashboard"
          className="fs-btn-outline mt-4 inline-block px-4 py-2"
        >
          Back to overview
        </Link>
      </div>
    );
  }

  const { report, metricsSnapshot, history, subAccountId } = drilldown;

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <PipelineChart snapshot={metricsSnapshot} />
          <div className="grid grid-cols-2 gap-4">
            {metricTiles(report, metricsSnapshot)}
          </div>
        </div>
        <div className="fs-card p-8">
          <p className="fs-tag mb-3 text-fs-secondary">ANALYSIS</p>
          <p className="fs-text-body mb-4 text-fs-secondary">
            No analysis available yet. Run your first analysis to see insights.
          </p>
          <RunAnalysisButton
            subAccountId={subAccountId}
            idleLabel="Run first analysis"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineChart snapshot={metricsSnapshot} />
        <div className="grid grid-cols-2 gap-4">
          {metricTiles(report, metricsSnapshot)}
        </div>
      </div>
      <AnalysisReport report={report} />
      <div className="fs-card overflow-hidden">
        <div className="border-b border-fs-border bg-fs-surface-2 px-6 py-4">
          <p className="fs-tag text-fs-secondary">ANALYSIS HISTORY</p>
        </div>
        {history.length === 0 ? (
          <div className="p-6">
            <p className="fs-text-small text-fs-secondary">
              No previous analyses. Analyses run every Monday at 9am.
            </p>
          </div>
        ) : (
          <div>
            <div className="fs-text-label grid grid-cols-[1.5fr_1fr_88px] border-b border-fs-border px-6 py-3 font-medium text-fs-faded">
              <span>Started</span>
              <span>Period</span>
              <span className="text-right">Status</span>
            </div>
            {history.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.5fr_1fr_88px] items-center border-b border-fs-border px-6 py-3 last:border-b-0"
              >
                <p className="fs-text-small font-mono text-fs-primary">
                  {row.createdAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="fs-text-caption font-mono text-fs-secondary">
                  {row.periodStart.toLocaleDateString()} –{" "}
                  {row.periodEnd.toLocaleDateString()}
                </p>
                <div className="flex justify-end">
                  <span className={statusClass(row.status)}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
