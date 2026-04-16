import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SettingsPageSkeleton } from "@/components/dashboard/SettingsPageSkeleton";
import { SettingsTeamSection } from "@/components/dashboard/SettingsTeamSection";
import { SettingsWorkspaceForm } from "@/components/dashboard/SettingsWorkspaceForm";
import { getCachedAuthSession } from "@/lib/auth-session";
import { loadOrganizationPreferences } from "@/lib/settings/load-organization-preferences";
import { getSortedIanaTimeZones } from "@/lib/settings/preferences-validation";
import { ensureAppOrganizationForBetterAuthOrg } from "@/lib/workspace-org";

async function SettingsPageContent() {
  const session = await getCachedAuthSession();
  if (!session?.session) {
    redirect("/sign-in");
  }

  const activeOrganizationId = session.session.activeOrganizationId;
  if (!activeOrganizationId) {
    redirect("/create-workspace");
  }

  const ensured = await ensureAppOrganizationForBetterAuthOrg({
    betterAuthOrganizationId: activeOrganizationId,
  });

  if (!ensured.ok) {
    return (
      <div className="fs-card mt-6 p-8">
        <p className="fs-text-body text-fs-red" role="alert">
          Workspace could not be loaded. Try again or contact support.
        </p>
      </div>
    );
  }

  const prefs = await loadOrganizationPreferences(ensured.id);
  const timezones = getSortedIanaTimeZones();

  if (!prefs) {
    return (
      <div className="fs-card mt-6 p-8">
        <p className="fs-text-body text-fs-red" role="alert">
          Workspace could not be loaded. Try again or contact support.
        </p>
      </div>
    );
  }

  return (
    <>
      <SettingsWorkspaceForm initial={prefs} timezones={timezones} />
      <SettingsTeamSection />
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="px-8 py-10">
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview /</p>
          <h1 className="fs-page-title text-fs-primary">Settings</h1>
          <p className="fs-breadcrumb">Workspace preferences</p>
        </div>
      </header>

      <Suspense fallback={<SettingsPageSkeleton />}>
        <SettingsPageContent />
      </Suspense>
    </div>
  );
}
