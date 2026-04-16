"use client";

export default function AnalysisHistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="fs-card mt-6 border border-fs-red/20 bg-fs-red-bg p-8"
      role="alert"
    >
      <p className="fs-text-body font-medium text-fs-red">
        Could not load analysis history
      </p>
      <p className="fs-text-small mt-2 text-fs-secondary">
        Something went wrong on our side. You can try again; if it keeps
        happening, contact support with the reference below.
      </p>
      {error.digest ? (
        <p className="fs-text-caption mt-3 font-mono text-fs-faded">
          Reference: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        className="fs-btn-outline mt-4 px-4 py-2"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
