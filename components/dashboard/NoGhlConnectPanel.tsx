import Link from "next/link";

export function NoGhlConnectPanel() {
  return (
    <div className="flex min-h-[min(520px,60vh)] flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-5 flex size-[52px] items-center justify-center rounded-[12px] border border-fs-amber-ring bg-fs-amber-dim">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden>
          <path
            d="M3 5 L25 5 L18 15 L10 15 Z"
            fill="var(--color-fs-amber)"
            opacity="0.7"
          />
          <rect
            x="11"
            y="15"
            width="6"
            height="5"
            fill="var(--color-fs-amber)"
            opacity="0.5"
          />
          <circle
            cx="14"
            cy="24"
            r="3"
            fill="var(--color-fs-amber)"
            opacity="0.5"
          />
        </svg>
      </div>
      <h2 className="fs-card-heading mb-2.5 text-fs-primary">
        Connect your GHL account
      </h2>
      <p className="fs-text-body-prose mb-7 max-w-[360px] text-fs-secondary">
        One OAuth click at the agency level. Every sub-account imports
        automatically in under 2 minutes.
      </p>
      <Link
        href="/api/ghl/oauth"
        className="fs-btn-primary fs-text-body px-7 py-2.5 no-underline"
      >
        Connect GoHighLevel
      </Link>
      <p className="fs-text-label mt-3.5 font-mono text-fs-faded">
        You&apos;ll be redirected to GHL to approve access
      </p>
    </div>
  );
}
