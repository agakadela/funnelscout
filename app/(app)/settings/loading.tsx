import { SettingsPageSkeleton } from "@/components/dashboard/SettingsPageSkeleton";

export default function SettingsLoading() {
  return (
    <div className="px-8 py-10">
      <div className="animate-pulse">
        <div className="h-3 w-36 rounded bg-fs-border" />
        <div className="mt-3 h-8 w-48 max-w-full rounded bg-fs-border" />
        <div className="mt-2 h-3 w-64 max-w-full rounded bg-fs-border" />
      </div>
      <SettingsPageSkeleton />
    </div>
  );
}
