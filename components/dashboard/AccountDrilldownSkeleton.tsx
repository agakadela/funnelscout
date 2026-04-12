const PIPELINE_SKELETON_BAR_WIDTHS = [
  "w-full",
  "w-[86%]",
  "w-[72%]",
  "w-[58%]",
  "w-[44%]",
] as const;

const REPORT_LINE_WIDTHS = ["w-[88%]", "w-[76%]", "w-[64%]"] as const;

export function AccountDrilldownSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-8 pb-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="fs-card h-64 p-6">
          <div className="mb-4 h-3 w-28 rounded bg-fs-border" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-3">
              <div className="h-3 w-24 shrink-0 rounded bg-fs-border" />
              <div
                className={`h-6 flex-1 rounded bg-fs-surface ${PIPELINE_SKELETON_BAR_WIDTHS[i] ?? "w-full"}`}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fs-card h-28 p-4">
              <div className="mb-2 h-3 w-20 rounded bg-fs-border" />
              <div className="h-7 w-16 rounded bg-fs-surface" />
            </div>
          ))}
        </div>
      </div>
      <div className="fs-report-block p-6">
        <div className="mb-4 h-3 w-40 rounded bg-fs-border" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 rounded bg-fs-border ${REPORT_LINE_WIDTHS[i % 3]}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
