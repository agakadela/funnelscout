import {
  AgencyOverviewSkeleton,
  AgencyOverviewStatRowSkeleton,
} from "@/components/dashboard/AgencyOverviewSkeleton";

export default function DashboardLoading() {
  return (
    <>
      <header className="fs-page-header animate-pulse">
        <div>
          <div
            className="mb-2 h-3 w-24 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
          <div
            className="h-6 w-48 rounded"
            style={{ backgroundColor: "var(--color-fs-surface)" }}
          />
        </div>
        <div
          className="h-9 w-32 rounded"
          style={{ backgroundColor: "var(--color-fs-border)" }}
        />
      </header>
      <AgencyOverviewStatRowSkeleton />
      <AgencyOverviewSkeleton />
    </>
  );
}
