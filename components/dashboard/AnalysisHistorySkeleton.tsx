export function AnalysisHistorySkeleton() {
  return (
    <div
      className="fs-card mt-6 animate-pulse overflow-hidden"
      aria-busy="true"
      aria-label="Loading analysis history"
    >
      <div className="border-b border-fs-border bg-fs-surface-2 px-6 py-4">
        <div className="h-3 w-40 rounded bg-fs-border" />
      </div>
      <div className="fs-text-label grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_88px] gap-3 border-b border-fs-border px-6 py-3">
        <div className="h-3 w-[72%] rounded bg-fs-border" />
        <div className="h-3 w-[86%] rounded bg-fs-border" />
        <div className="h-3 w-[64%] rounded bg-fs-border" />
        <div className="h-3 w-[55%] rounded bg-fs-border" />
        <div className="h-3 w-12 justify-self-end rounded bg-fs-border" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_88px] gap-3 border-b border-fs-border px-6 py-3 last:border-b-0"
        >
          <div
            className={`h-3 rounded bg-fs-border ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-[86%]" : "w-[72%]"}`}
          />
          <div className="h-3 w-[80%] rounded bg-fs-border" />
          <div className="h-3 w-[70%] rounded bg-fs-border" />
          <div className="h-3 w-[60%] rounded bg-fs-border" />
          <div className="h-3 w-14 justify-self-end rounded bg-fs-border" />
        </div>
      ))}
    </div>
  );
}
