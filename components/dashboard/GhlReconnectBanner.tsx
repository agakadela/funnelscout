import Link from "next/link";

export function GhlReconnectBanner() {
  return (
    <div
      className="fs-text-small flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-fs-border bg-fs-surface-2 px-4 py-3 text-fs-secondary"
      role="status"
    >
      <span className="text-center text-fs-primary">
        GHL disconnected — reconnect now
      </span>
      <Link
        href="/api/ghl/oauth"
        prefetch={false}
        className="font-semibold text-fs-amber hover:text-fs-amber-hover"
      >
        Reconnect in GoHighLevel
      </Link>
    </div>
  );
}
