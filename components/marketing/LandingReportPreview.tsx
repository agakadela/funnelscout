function ReportClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 text-fs-amber"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 4v4l3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type RecRow = {
  body: string;
  impact: string;
  impactClass: "green" | "muted";
};

const RECOMMENDATIONS: RecRow[] = [
  {
    body: 'Follow up on all 4 stalled proposals this week. If no response within 48h, move to "Needs Nurturing" stage.',
    impact: "$18–24k",
    impactClass: "green",
  },
  {
    body: "Schedule a check-in call for the two oldest stalled deals (Deal #7 and Deal #11).",
    impact: "$12k",
    impactClass: "green",
  },
  {
    body: "Review proposal validity window with client to create urgency in future cycles.",
    impact: "long-term",
    impactClass: "muted",
  },
];

export function LandingReportPreview() {
  return (
    <div className="mx-auto max-w-[680px] overflow-hidden rounded-card border border-fs-border bg-fs-surface-2">
      <div className="flex flex-col gap-2 border-b border-fs-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div className="flex min-w-0 items-center gap-2">
          <ReportClockIcon />
          <span
            className="truncate font-medium text-fs-primary"
            style={{ fontSize: "var(--font-size-small)" }}
          >
            Pacific Law Firm — Weekly Analysis
          </span>
        </div>
        <span
          className="shrink-0 font-mono text-fs-faded"
          style={{ fontSize: "var(--font-size-label)" }}
        >
          Mon Apr 7, 2026 · 09:04 AM
        </span>
      </div>

      <div className="flex gap-3.5 border-b border-fs-border px-5 py-[18px]">
        <div
          className="mt-0.5 w-[3px] shrink-0 rounded-sm bg-fs-secondary"
          aria-hidden
        />
        <div>
          <p className="fs-tag mb-2 text-fs-secondary">METRICS SUMMARY</p>
          <p
            className="text-fs-muted"
            style={{ fontSize: "13px", lineHeight: 1.65 }}
          >
            About $68k open pipeline across 14 deals. Time in &quot;Proposal
            Sent&quot; is creeping up—worth a closer look. Conversion softened
            versus last week, so the story of the week is momentum, not just
            volume.
          </p>
        </div>
      </div>

      <div className="flex gap-3.5 border-b border-fs-border px-5 py-[18px]">
        <div
          className="mt-0.5 w-[3px] shrink-0 rounded-sm bg-fs-red"
          aria-hidden
        />
        <div>
          <p className="fs-tag mb-2 text-fs-red">ANOMALIES</p>
          <p
            className="text-fs-muted"
            style={{ fontSize: "13px", lineHeight: 1.65 }}
          >
            Four proposals have been sitting too long—with meaningful dollars
            attached. Conversion dipped more than usual week over week, so this
            is the kind of pattern you will want on your Monday call list.
          </p>
        </div>
      </div>

      <div className="flex gap-3.5 px-5 py-[18px]">
        <div
          className="mt-0.5 w-[3px] shrink-0 rounded-sm bg-fs-amber"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="fs-tag mb-3 text-fs-amber">RECOMMENDATIONS</p>
          <div className="flex flex-col gap-2">
            {RECOMMENDATIONS.map((row, index) => (
              <div
                key={`landing-report-rec-${index}`}
                className="flex items-start justify-between gap-4 rounded-md border border-fs-border bg-fs-bg px-3 py-2.5"
              >
                <p
                  className="min-w-0 text-fs-muted"
                  style={{ fontSize: "12px", lineHeight: 1.6 }}
                >
                  {row.body}
                </p>
                <div className="shrink-0 text-right">
                  <p
                    className="mb-0.5 font-mono text-fs-faded"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    IMPACT
                  </p>
                  <p
                    className={`font-mono text-[13px] font-semibold whitespace-nowrap ${
                      row.impactClass === "green"
                        ? "text-fs-green"
                        : "text-fs-secondary"
                    }`}
                  >
                    {row.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
