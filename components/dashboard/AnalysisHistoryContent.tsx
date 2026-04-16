import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedAuthSession } from "@/lib/auth-session";
import { loadAnalysisHistoryData } from "@/lib/dashboard/load-analysis-history";

function statusClass(status: string): string {
  if (status === "completed") return "fs-status-completed";
  if (status === "running" || status === "pending") return "fs-status-running";
  if (status === "failed") return "fs-status-failed";
  return "fs-status-running";
}

export async function AnalysisHistoryContent({ page }: { page: number }) {
  const session = await getCachedAuthSession();
  if (!session?.session) {
    redirect("/sign-in");
  }
  const betterAuthOrganizationId = session.session.activeOrganizationId;
  if (!betterAuthOrganizationId) {
    redirect("/create-workspace");
  }

  const data = await loadAnalysisHistoryData({
    betterAuthOrganizationId,
    page,
  });

  if (data.kind === "not_found") {
    return (
      <div className="fs-card mt-6 p-8">
        <p className="fs-text-body font-medium text-fs-red" role="alert">
          Workspace could not be loaded.
        </p>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Try returning to the overview or signing in again.
        </p>
        <Link
          href="/dashboard"
          className="fs-btn-outline mt-4 inline-block px-4 py-2"
        >
          Back to overview
        </Link>
      </div>
    );
  }

  const { rows, page: currentPage, pageSize, totalCount } = data;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount === 0) {
    return (
      <div className="fs-card mt-6 p-8">
        <p className="fs-text-body font-medium text-fs-primary">
          No analyses yet
        </p>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Completed and scheduled runs from all clients will appear here. Open a
          client from the overview and run an analysis to get started.
        </p>
        <Link
          href="/dashboard"
          className="fs-btn-primary mt-4 inline-block px-4 py-2"
        >
          Go to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="fs-card mt-6 overflow-hidden">
      <div className="border-b border-fs-border bg-fs-surface-2 px-6 py-4">
        <p className="fs-tag text-fs-secondary">ALL CLIENTS</p>
        <p className="fs-text-caption mt-1 text-fs-faded">
          {totalCount} {totalCount === 1 ? "run" : "runs"} total
          {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : null}
        </p>
      </div>
      <div className="fs-text-label hidden border-b border-fs-border px-6 py-3 font-medium text-fs-faded md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_88px] md:gap-3">
        <span>Client</span>
        <span>Period</span>
        <span>Started</span>
        <span>Status</span>
        <span className="text-right">Report</span>
      </div>
      <ul className="divide-y divide-fs-border">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="flex flex-col gap-3 px-6 py-4 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_88px] md:items-center md:gap-3">
              <div>
                <p className="fs-text-label text-fs-faded md:hidden">Client</p>
                <p className="fs-text-small font-medium text-fs-primary">
                  {row.subAccountName}
                </p>
              </div>
              <div>
                <p className="fs-text-label text-fs-faded md:hidden">Period</p>
                <p className="fs-text-caption font-mono text-fs-secondary">
                  {row.periodStart.toLocaleDateString()} –{" "}
                  {row.periodEnd.toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="fs-text-label text-fs-faded md:hidden">Started</p>
                <p className="fs-text-small font-mono text-fs-primary">
                  {row.createdAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {row.completedAt ? (
                  <p className="fs-text-caption mt-0.5 text-fs-faded">
                    Completed{" "}
                    {row.completedAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="fs-text-label text-fs-faded md:hidden">Status</p>
                <div className="flex flex-col items-start gap-1">
                  <span className={statusClass(row.status)}>{row.status}</span>
                  {row.errorSnippet ? (
                    <p className="fs-text-caption text-fs-secondary wrap-break-word">
                      {row.errorSnippet}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="md:text-right">
                <p className="fs-text-label text-fs-faded md:hidden">Report</p>
                <Link
                  href={`/accounts/${encodeURIComponent(row.ghlLocationId)}`}
                  className="fs-btn-outline fs-text-caption inline-block px-3 py-1.5 no-underline"
                >
                  View
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fs-border px-6 py-4">
          {currentPage > 1 ? (
            <Link
              href={`/analysis-history?page=${currentPage - 1}`}
              className="fs-btn-outline px-4 py-2"
            >
              Previous
            </Link>
          ) : (
            <span className="fs-btn-outline pointer-events-none px-4 py-2 opacity-40">
              Previous
            </span>
          )}
          {currentPage < totalPages ? (
            <Link
              href={`/analysis-history?page=${currentPage + 1}`}
              className="fs-btn-outline px-4 py-2"
            >
              Next
            </Link>
          ) : (
            <span className="fs-btn-outline pointer-events-none px-4 py-2 opacity-40">
              Next
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
