import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { organization as baOrganization } from "@/drizzle/better-auth-schema";
import { organizations } from "@/drizzle/schema";
import { getCachedAuthSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  healthScoreFromPipelineSnapshot,
  healthTier,
} from "@/lib/dashboard/health-score";
import { loadSubAccountsMetricsContext } from "@/lib/dashboard/load-sub-accounts-metrics-context";

function sidebarInitials(name: string, email: string): string {
  const n = name.trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getCachedAuthSession();

  if (!session?.session) {
    redirect("/sign-in");
  }

  const activeOrganizationId = session.session.activeOrganizationId;
  if (!activeOrganizationId) {
    redirect("/sign-up");
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.betterAuthOrganizationId, activeOrganizationId),
  });

  let agencyDisplayName = "Agency";
  if (orgRow?.name) {
    agencyDisplayName = orgRow.name;
  } else {
    const [ba] = await db
      .select({ name: baOrganization.name })
      .from(baOrganization)
      .where(eq(baOrganization.id, activeOrganizationId))
      .limit(1);
    if (ba?.name) {
      agencyDisplayName = ba.name;
    }
  }

  const ghlConnected = Boolean(orgRow?.ghlAccessToken);

  let sidebarClients: Array<{
    id: string;
    name: string;
    ghlLocationId: string;
    healthTier: ReturnType<typeof healthTier>;
    healthScore: number;
  }> = [];

  if (orgRow && ghlConnected) {
    const contexts = await loadSubAccountsMetricsContext(orgRow.id);
    sidebarClients = contexts.map((ctx) => {
      const score = ctx.snapshot
        ? healthScoreFromPipelineSnapshot(ctx.snapshot)
        : 50;
      return {
        id: ctx.id,
        name: ctx.name,
        ghlLocationId: ctx.ghlLocationId,
        healthTier: healthTier(score),
        healthScore: score,
      };
    });
    sidebarClients.sort((a, b) => b.healthScore - a.healthScore);
  }

  const user = session.user;
  const userInitials = sidebarInitials(
    typeof user.name === "string" ? user.name : "",
    typeof user.email === "string" ? user.email : "",
  );

  return (
    <div className="fs-shell">
      <AppSidebar
        ghlConnected={ghlConnected}
        clients={sidebarClients}
        agencyName={agencyDisplayName}
        userInitials={userInitials}
        clientCount={sidebarClients.length}
      />
      <div className="fs-main">{children}</div>
    </div>
  );
}
