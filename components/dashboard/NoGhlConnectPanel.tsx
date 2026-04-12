import Link from "next/link";

export function NoGhlConnectPanel() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center"
      style={{ minHeight: "min(520px, 60vh)" }}
    >
      <div
        className="mb-5 flex size-[52px] items-center justify-center rounded-[12px]"
        style={{
          backgroundColor: "var(--color-fs-amber-dim)",
          border: "1px solid var(--color-fs-amber-ring)",
        }}
      >
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
      <h2
        className="mb-2.5 text-fs-primary"
        style={{
          fontSize: "var(--font-size-heading)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading)",
        }}
      >
        Connect your GHL account
      </h2>
      <p
        className="mb-7 max-w-[360px] text-fs-secondary"
        style={{ fontSize: "var(--font-size-body)", lineHeight: 1.65 }}
      >
        One OAuth click at the agency level. Every sub-account imports
        automatically in under 2 minutes.
      </p>
      <Link
        href="/api/ghl/oauth"
        className="fs-btn-primary px-7 py-2.5 no-underline"
        style={{ fontSize: "var(--font-size-body)" }}
      >
        Connect GoHighLevel
      </Link>
      <p
        className="mt-3.5 font-mono text-fs-faded"
        style={{ fontSize: "11px" }}
      >
        You&apos;ll be redirected to GHL to approve access
      </p>
    </div>
  );
}
