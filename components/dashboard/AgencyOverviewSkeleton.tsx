const HEADER_CELL_OPACITY = [
  "opacity-100",
  "opacity-90",
  "opacity-80",
  "opacity-70",
  "opacity-60",
] as const;

const ROW_OPACITY = ["opacity-100", "opacity-80", "opacity-60"] as const;

export function AgencyOverviewStatRowSkeleton() {
  return (
    <div className="fs-stat-row animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="fs-stat-cell">
          <div className="mb-2 h-3 w-24 rounded bg-fs-border" />
          <div className="h-8 w-20 rounded bg-fs-surface" />
        </div>
      ))}
    </div>
  );
}

export function AgencyOverviewSkeleton() {
  return (
    <div className="animate-pulse px-8 pb-8">
      <div className="fs-card overflow-hidden">
        <div className="border-b border-fs-border bg-fs-surface-2 px-6 py-4">
          <div className="h-3 w-20 rounded bg-fs-border" />
        </div>
        <div className="p-6">
          <div className="mb-4 grid grid-cols-[2.5fr_1fr_1fr_1fr_110px] gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-3 rounded bg-fs-border ${HEADER_CELL_OPACITY[i] ?? "opacity-100"}`}
              />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, row) => (
            <div
              key={row}
              className={`mb-3 grid grid-cols-[2.5fr_1fr_1fr_1fr_110px] gap-3 ${ROW_OPACITY[row] ?? "opacity-100"}`}
            >
              {Array.from({ length: 5 }).map((_, col) => (
                <div
                  key={col}
                  className={`h-4 rounded ${col === 0 ? "bg-fs-surface" : "bg-fs-border"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
