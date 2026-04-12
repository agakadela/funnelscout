import type { AnalysisReport as AnalysisReportType } from "@/lib/ai/types";

function impactClassName(impact: string): string {
  const t = impact.trim().toLowerCase();
  if (t.includes("long") || t === "$0") {
    return "text-fs-secondary";
  }
  if (impact.trim().startsWith("-")) {
    return "text-fs-red";
  }
  return "text-fs-green";
}

type AnalysisReportProps = {
  report: AnalysisReportType | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

export function AnalysisReport({
  report,
  loading,
  error,
  onRetry,
}: AnalysisReportProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="fs-report-block p-5">
          <div
            className="mb-3 h-3 w-32 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded"
                style={{
                  backgroundColor: "var(--color-fs-surface)",
                  width: `${90 - (i % 2) * 10}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="fs-card"
        style={{ padding: "32px", display: "flex", gap: "14px" }}
      >
        <div className="fs-status-failed flex h-9 w-9 items-center justify-center">
          !
        </div>
        <div>
          <p style={{ color: "var(--color-fs-red)", fontWeight: 500 }}>
            Analysis failed to load
          </p>
          <p
            className="text-fs-secondary"
            style={{ fontSize: "var(--font-size-caption)" }}
          >
            There was a problem fetching the latest report. This is usually
            temporary.
          </p>
          {onRetry ? (
            <button
              type="button"
              className="fs-btn-outline mt-3.5 px-4 py-2"
              onClick={onRetry}
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="fs-report-block fs-stripe-neutral p-5">
        <p
          className="fs-tag mb-3"
          style={{ color: "var(--color-fs-secondary)" }}
        >
          METRICS SUMMARY
        </p>
        <p
          className="mb-1 font-semibold text-fs-primary"
          style={{ fontSize: "var(--font-size-subheading)" }}
        >
          {report.metrics.headline}
        </p>
        <p
          className="mb-3 text-fs-faded"
          style={{ fontSize: "var(--font-size-caption)" }}
        >
          {report.metrics.periodDescription}
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {report.metrics.kpis.map((kpi) => (
            <div key={kpi.label} className="fs-rec-card">
              <div>
                <p className="fs-rec-title">{kpi.label}</p>
                <p className="fs-rec-body">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
        <p
          className="text-fs-muted"
          style={{ fontSize: "var(--font-size-small)" }}
        >
          {report.metrics.summary}
        </p>
      </section>

      <section className="fs-report-block fs-stripe-red p-5">
        <p className="fs-tag mb-3" style={{ color: "var(--color-fs-red)" }}>
          ANOMALIES
        </p>
        {report.anomalies.anomalies.length === 0 ? (
          <p
            className="text-fs-secondary"
            style={{ fontSize: "var(--font-size-small)" }}
          >
            No anomalies flagged for this period.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.anomalies.anomalies.map((a) => (
              <li key={a.id} className="fs-rec-card">
                <div>
                  <p className="fs-rec-title">{a.title}</p>
                  <p className="fs-rec-body">{a.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fs-report-block fs-stripe-amber p-5">
        <p className="fs-tag mb-3" style={{ color: "var(--color-fs-amber)" }}>
          RECOMMENDATIONS
        </p>
        <div className="space-y-3">
          {report.recommendations.recommendations.map((rec, idx) => {
            const impact = rec.impact.trim();
            return (
              <div key={`${rec.title}-${idx}`} className="fs-rec-card">
                <div className="min-w-0 flex-1">
                  <p className="fs-rec-title">{rec.title}</p>
                  <p className="fs-rec-body">{rec.body}</p>
                </div>
                <div className="fs-impact-badge flex flex-col items-end gap-0.5">
                  <span
                    className="text-right font-mono text-fs-faded"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Impact
                  </span>
                  <span
                    className={`text-right font-mono font-semibold ${impactClassName(impact)}`}
                    style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                  >
                    {impact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
