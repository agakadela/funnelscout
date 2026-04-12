import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import { pipelineRowsFromEventsByStage } from "@/lib/dashboard/pipeline-stages";
import { formatUsdCompact } from "@/lib/dashboard/format";

type PipelineChartProps = {
  snapshot: PipelineMetricsSnapshot | null;
  loading?: boolean;
};

const LOADING_BAR_WIDTHS = [
  "w-full",
  "w-[86%]",
  "w-[72%]",
  "w-[58%]",
  "w-[44%]",
] as const;

export function PipelineChart({ snapshot, loading }: PipelineChartProps) {
  if (loading) {
    return (
      <div className="fs-card animate-pulse p-6">
        <p className="fs-tag mb-4 text-fs-secondary">PIPELINE</p>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <div className="h-3 w-24 shrink-0 rounded bg-fs-border" />
            <div
              className={`h-6 flex-1 rounded bg-fs-surface ${LOADING_BAR_WIDTHS[i] ?? "w-full"}`}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!snapshot || Object.keys(snapshot.eventsByStageId).length === 0) {
    return (
      <div className="fs-card p-6">
        <p className="fs-tag mb-2 text-fs-secondary">PIPELINE</p>
        <p className="fs-text-small text-fs-secondary">
          No pipeline data for this period.
        </p>
      </div>
    );
  }

  const rows = pipelineRowsFromEventsByStage(snapshot.eventsByStageId);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="fs-card p-6">
      <p className="fs-tag mb-4 text-fs-secondary">PIPELINE</p>
      <div className="space-y-3">
        {rows.map((row) => {
          const widthPct = Math.max(8, Math.round((row.count / max) * 100));
          const fill = row.stalled
            ? "var(--color-fs-red-bg)"
            : "var(--color-fs-green-bg)";
          const stroke = row.stalled
            ? "rgba(248, 113, 113, 0.25)"
            : "rgba(74, 222, 128, 0.15)";
          return (
            <div key={row.stageId} className="flex items-center gap-3">
              <div className="fs-text-small min-w-[110px] shrink-0 font-mono text-fs-secondary">
                {row.label}
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative h-6 max-w-full">
                  <svg
                    aria-hidden
                    className="block max-w-full"
                    height="24"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 24"
                    width={`${widthPct}%`}
                  >
                    <rect
                      fill={fill}
                      height="24"
                      rx="4"
                      stroke={stroke}
                      strokeWidth="1"
                      width="100"
                      x="0"
                      y="0"
                    />
                  </svg>
                  {row.stalled ? (
                    <span className="absolute left-2 top-1/2 flex -translate-y-1/2">
                      <span className="fs-stalled-tag">stalled</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="fs-text-small shrink-0 font-mono text-fs-primary">
                {row.count}
              </div>
            </div>
          );
        })}
      </div>
      <p className="fs-text-caption mt-4 text-fs-faded">
        Volume {formatUsdCompact(snapshot.sumMonetaryValue)}
      </p>
    </div>
  );
}
