export function AccountDrilldownSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-8 pb-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="fs-card h-64 p-6">
          <div
            className="mb-4 h-3 w-28 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-3">
              <div
                className="h-3 w-24 shrink-0 rounded"
                style={{ backgroundColor: "var(--color-fs-border)" }}
              />
              <div
                className="h-6 flex-1 rounded"
                style={{
                  width: `${100 - i * 16}%`,
                  backgroundColor: "var(--color-fs-surface)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fs-card h-28 p-4">
              <div
                className="mb-2 h-3 w-20 rounded"
                style={{ backgroundColor: "var(--color-fs-border)" }}
              />
              <div
                className="h-7 w-16 rounded"
                style={{ backgroundColor: "var(--color-fs-surface)" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="fs-report-block p-6">
        <div
          className="mb-4 h-3 w-40 rounded"
          style={{ backgroundColor: "var(--color-fs-border)" }}
        />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded"
              style={{
                backgroundColor: "var(--color-fs-border)",
                width: `${88 - (i % 3) * 12}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
