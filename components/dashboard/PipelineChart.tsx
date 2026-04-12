import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";
import { pipelineRowsFromEventsByStage } from "@/lib/dashboard/pipeline-stages";
import { formatUsdCompact } from "@/lib/dashboard/format";

type PipelineChartProps = {
  snapshot: PipelineMetricsSnapshot | null;
  loading?: boolean;
};

export function PipelineChart({ snapshot, loading }: PipelineChartProps) {
  if (loading) {
    return (
      <div className="fs-card animate-pulse p-6">
        <p
          className="fs-tag mb-4"
          style={{ color: "var(--color-fs-secondary)" }}
        >
          PIPELINE
        </p>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <div
              className="h-3 w-24 shrink-0 rounded"
              style={{ backgroundColor: "var(--color-fs-border)" }}
            />
            <div
              className="h-6 flex-1 rounded"
              style={{
                width: `${100 - i * 14}%`,
                backgroundColor: "var(--color-fs-surface)",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!snapshot || Object.keys(snapshot.eventsByStageId).length === 0) {
    return (
      <div className="fs-card p-6">
        <p
          className="fs-tag mb-2"
          style={{ color: "var(--color-fs-secondary)" }}
        >
          PIPELINE
        </p>
        <p
          className="text-fs-secondary"
          style={{ fontSize: "var(--font-size-small)" }}
        >
          No pipeline data for this period.
        </p>
      </div>
    );
  }

  const rows = pipelineRowsFromEventsByStage(snapshot.eventsByStageId);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="fs-card p-6">
      <p className="fs-tag mb-4" style={{ color: "var(--color-fs-secondary)" }}>
        PIPELINE
      </p>
      <div className="space-y-3">
        {rows.map((row) => {
          const widthPct = Math.max(8, Math.round((row.count / max) * 100));
          return (
            <div key={row.stageId} className="flex items-center gap-3">
              <div
                className="shrink-0 font-mono text-fs-secondary"
                style={{
                  fontSize: "var(--font-size-small)",
                  minWidth: "110px",
                }}
              >
                {row.label}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={
                    row.stalled
                      ? "fs-pipeline-bar fs-pipeline-bar-stalled"
                      : "fs-pipeline-bar"
                  }
                  style={{ width: `${widthPct}%`, maxWidth: "100%" }}
                >
                  {row.stalled ? (
                    <span className="fs-stalled-tag">stalled</span>
                  ) : null}
                </div>
              </div>
              <div
                className="shrink-0 font-mono text-fs-primary"
                style={{ fontSize: "var(--font-size-small)" }}
              >
                {row.count}
              </div>
            </div>
          );
        })}
      </div>
      <p
        className="mt-4 text-fs-faded"
        style={{ fontSize: "var(--font-size-caption)" }}
      >
        Volume {formatUsdCompact(snapshot.sumMonetaryValue)}
      </p>
    </div>
  );
}
