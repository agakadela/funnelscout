import { and, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { organization as baOrganization } from "@/drizzle/better-auth-schema";
import { analyses, organizations, subAccounts } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  healthScoreFromPipelineSnapshot,
  healthTier,
} from "@/lib/dashboard/health-score";
import { isPipelineMetricsSnapshot } from "@/lib/dashboard/load-agency-overview";

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
    const subs = await db.query.subAccounts.findMany({
      where: and(
        eq(subAccounts.organizationId, orgRow.id),
        eq(subAccounts.isActive, true),
      ),
    });

    const subIds = subs.map((s) => s.id);
    const analysisRows =
      subIds.length === 0
        ? []
        : await db.query.analyses.findMany({
            where: and(
              eq(analyses.organizationId, orgRow.id),
              eq(analyses.status, "completed"),
              inArray(analyses.subAccountId, subIds),
            ),
            orderBy: [desc(analyses.createdAt)],
          });

    const latestBySub = new Map<string, (typeof analysisRows)[number]>();
    for (const row of analysisRows) {
      if (!latestBySub.has(row.subAccountId)) {
        latestBySub.set(row.subAccountId, row);
      }
    }

    sidebarClients = subs.map((sub) => {
      const latest = latestBySub.get(sub.id);
      const snap = latest?.metricsJson;
      const score = isPipelineMetricsSnapshot(snap)
        ? healthScoreFromPipelineSnapshot(snap)
        : 50;
      return {
        id: sub.id,
        name: sub.name,
        ghlLocationId: sub.ghlLocationId,
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
