export function AgencyOverviewStatRowSkeleton() {
  return (
    <div className="fs-stat-row animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="fs-stat-cell">
          <div
            className="mb-2 h-3 w-24 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
          <div
            className="h-8 w-20 rounded"
            style={{ backgroundColor: "var(--color-fs-surface)" }}
          />
        </div>
      ))}
    </div>
  );
}

export function AgencyOverviewSkeleton() {
  return (
    <div className="animate-pulse px-8 pb-8">
      <div className="fs-card overflow-hidden">
        <div
          className="border-b border-fs-border px-6 py-4"
          style={{ backgroundColor: "var(--color-fs-surface-2)" }}
        >
          <div
            className="h-3 w-20 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
        </div>
        <div className="p-6">
          <div
            className="mb-4 grid gap-3"
            style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 110px" }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded"
                style={{
                  backgroundColor: "var(--color-fs-border)",
                  opacity: 1 - i * 0.12,
                }}
              />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, row) => (
            <div
              key={row}
              className="mb-3 grid gap-3"
              style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 110px" }}
            >
              {Array.from({ length: 5 }).map((_, col) => (
                <div
                  key={col}
                  className="h-4 rounded"
                  style={{
                    backgroundColor:
                      col === 0
                        ? "var(--color-fs-surface)"
                        : "var(--color-fs-border)",
                    opacity: 1 - row * 0.2 - col * 0.03,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
