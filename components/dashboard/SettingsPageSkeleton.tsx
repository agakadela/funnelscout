export function SettingsPageSkeleton() {
  return (
    <div
      className="animate-pulse"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className="fs-card mt-6 p-8">
        <div className="h-4 w-56 rounded bg-fs-border" />
        <div className="mt-2 h-3 w-full max-w-md rounded bg-fs-border" />
        <div className="mt-8 space-y-6">
          <div className="h-10 w-full max-w-lg rounded bg-fs-border" />
          <div className="h-10 w-full max-w-lg rounded bg-fs-border" />
          <div className="h-10 w-full max-w-xl rounded bg-fs-border" />
        </div>
        <div className="mt-8 h-10 w-36 rounded bg-fs-border" />
      </div>
      <div className="fs-card mt-6 p-8">
        <div className="h-4 w-32 rounded bg-fs-border" />
        <div className="mt-3 h-3 w-full max-w-lg rounded bg-fs-border" />
        <div className="mt-4 h-3 w-[66%] max-w-md rounded bg-fs-border" />
      </div>
    </div>
  );
}
