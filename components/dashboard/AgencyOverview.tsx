import Link from "next/link";

import type { AgencyOverviewData } from "@/lib/dashboard/load-agency-overview";
import { formatUsdCompact } from "@/lib/dashboard/format";

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
      <div className="fs-card p-8">
        <p className="fs-tag mb-3 text-fs-secondary">CLIENTS</p>
        <p className="fs-text-body text-fs-secondary">
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
      <div className="border-b border-fs-border bg-fs-surface-2 px-6 py-4">
        <p className="fs-tag text-fs-secondary">CLIENTS</p>
      </div>
      <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_110px] items-center gap-3 border-b border-fs-border px-6 py-3">
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
              className="grid grid-cols-[2.5fr_1fr_1fr_1fr_110px] cursor-pointer items-center gap-3 border-b border-fs-border px-6 py-4 no-underline last:border-b-0 hover:bg-fs-surface-2/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fs-primary">
                  {row.name}
                </p>
                {showStalledMeta ? (
                  <p className="fs-text-caption text-fs-red">
                    {row.stalledDeals} stalled deals
                  </p>
                ) : pipelineMeta ? (
                  <p className="fs-text-caption text-fs-faded">
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
                <div className="fs-bar-track min-w-0 flex-1 overflow-hidden rounded-sm">
                  <svg
                    aria-hidden
                    className="block max-w-full"
                    height="3"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 3"
                    width={`${Math.min(100, Math.max(4, row.healthScore))}%`}
                  >
                    <rect
                      fill={
                        row.healthTier === "green"
                          ? "var(--color-fs-green)"
                          : row.healthTier === "yellow"
                            ? "var(--color-fs-yellow)"
                            : "var(--color-fs-red)"
                      }
                      height="3"
                      rx="1"
                      width="100"
                      x="0"
                      y="0"
                    />
                  </svg>
                </div>
                <span
                  className={`fs-text-caption shrink-0 font-mono font-semibold ${healthScoreTextClass(row.healthTier)}`}
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
