import Link from "next/link";

import type { AgencyOverviewData } from "@/lib/dashboard/load-agency-overview";
import { formatUsdCompact } from "@/lib/dashboard/format";

function barFillClass(tier: "green" | "yellow" | "red"): string {
  if (tier === "green") return "bg-fs-green";
  if (tier === "yellow") return "bg-fs-yellow";
  return "bg-fs-red";
}

function healthScoreTextClass(tier: "green" | "yellow" | "red"): string {
  if (tier === "green") return "text-fs-green";
  if (tier === "yellow") return "text-fs-yellow";
  return "text-fs-red";
}

export function AgencyOverview({ data }: { data: AgencyOverviewData }) {
  if (data.kind === "no_ghl") {
    return null;
  }

  if (data.kind === "no_clients") {
    return (
      <div className="fs-card" style={{ padding: "32px" }}>
        <p
          className="fs-tag mb-3"
          style={{ color: "var(--color-fs-secondary)" }}
        >
          CLIENTS
        </p>
        <p
          className="text-fs-secondary"
          style={{ fontSize: "var(--font-size-body)" }}
        >
          No clients found. Your sub-accounts will appear here after the first
          sync.
        </p>
      </div>
    );
  }

  if (data.kind !== "ready") {
    return null;
  }

  const { clients } = data;

  return (
    <div className="fs-card overflow-hidden">
      <div
        className="border-b border-fs-border px-6 py-4"
        style={{ backgroundColor: "var(--color-fs-surface-2)" }}
      >
        <p className="fs-tag" style={{ color: "var(--color-fs-secondary)" }}>
          CLIENTS
        </p>
      </div>
      <div
        className="grid items-center gap-3 border-b border-fs-border px-6 py-3"
        style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 110px" }}
      >
        <span className="fs-col-header">Client</span>
        <span className="fs-col-header">Pipeline</span>
        <span className="fs-col-header">Deals</span>
        <span className="fs-col-header">Conv.</span>
        <span className="fs-col-header text-right">Health</span>
      </div>
      <div>
        {clients.map((row) => {
          const showStalledMeta =
            row.stalledDeals > 0 && row.healthTier === "red";
          const pipelineMeta =
            !showStalledMeta && row.dealCount > 0
              ? `${row.dealCount} deal${row.dealCount === 1 ? "" : "s"}`
              : null;
          return (
            <Link
              key={row.id}
              href={`/accounts/${row.ghlLocationId}`}
              className="grid cursor-pointer items-center gap-3 border-b border-fs-border px-6 py-4 no-underline last:border-b-0 hover:bg-fs-surface-2/40"
              style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 110px" }}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fs-primary">
                  {row.name}
                </p>
                {showStalledMeta ? (
                  <p
                    className="text-fs-red"
                    style={{ fontSize: "var(--font-size-caption)" }}
                  >
                    {row.stalledDeals} stalled deals
                  </p>
                ) : pipelineMeta ? (
                  <p
                    className="text-fs-faded"
                    style={{ fontSize: "var(--font-size-caption)" }}
                  >
                    {pipelineMeta}
                  </p>
                ) : null}
              </div>
              <p className="fs-cell">{formatUsdCompact(row.pipelineUsd)}</p>
              <p className="fs-cell">{row.dealCount}</p>
              <p
                className={`fs-cell ${row.healthTier === "red" ? "text-fs-red" : ""}`}
              >
                {row.conversionLabel}
              </p>
              <div className="flex items-center gap-2">
                <div className="fs-bar-track min-w-0 flex-1">
                  <div
                    className={`h-full rounded-sm ${barFillClass(row.healthTier)}`}
                    style={{
                      width: `${Math.min(100, Math.max(4, row.healthScore))}%`,
                    }}
                  />
                </div>
                <span
                  className={`shrink-0 font-mono ${healthScoreTextClass(row.healthTier)}`}
                  style={{
                    fontSize: "var(--font-size-caption)",
                    fontWeight: 600,
                  }}
                >
                  {row.healthScore}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AgencyOverviewStatRow({
  data,
}: {
  data: Extract<AgencyOverviewData, { kind: "ready" } | { kind: "no_clients" }>;
}) {
  const { stats } = data;
  const atRisk = stats.atRiskPipelineUsd;
  return (
    <div className="fs-stat-row">
      <div className="fs-stat-cell">
        <p className="fs-stat-label">Total pipeline</p>
        <p className="fs-metric">{formatUsdCompact(stats.totalPipelineUsd)}</p>
      </div>
      <div className="fs-stat-cell">
        <p className="fs-stat-label">Open deals</p>
        <p className="fs-metric">{stats.openDeals.toLocaleString("en-US")}</p>
      </div>
      <div className="fs-stat-cell">
        <p className="fs-stat-label">Avg conversion</p>
        <p className="fs-metric">{stats.avgConversionLabel}</p>
      </div>
      <div className="fs-stat-cell">
        <p className="fs-stat-label">At risk</p>
        <p className={atRisk > 0 ? "fs-metric text-fs-red" : "fs-metric"}>
          {formatUsdCompact(atRisk)}
        </p>
      </div>
    </div>
  );
}
