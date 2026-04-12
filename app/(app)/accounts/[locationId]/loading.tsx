import { AccountDrilldownSkeleton } from "@/components/dashboard/AccountDrilldownSkeleton";

export default function AccountLoading() {
  return (
    <>
      <header className="fs-page-header animate-pulse">
        <div>
          <div
            className="mb-2 h-3 w-40 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
          <div
            className="h-6 w-56 rounded"
            style={{ backgroundColor: "var(--color-fs-surface)" }}
          />
          <div
            className="mt-2 h-3 w-48 rounded"
            style={{ backgroundColor: "var(--color-fs-border)" }}
          />
        </div>
        <div
          className="h-9 w-32 rounded"
          style={{ backgroundColor: "var(--color-fs-border)" }}
        />
      </header>
      <AccountDrilldownSkeleton />
    </>
  );
}
