import { and, eq, max } from "drizzle-orm";

import { analyses, organizations } from "@/drizzle/schema";
import { db } from "@/lib/db";

export function formatLastAnalysisLabel(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function getLastCompletedAnalysisLabelForBetterAuthOrg(
  betterAuthOrganizationId: string,
): Promise<string | null> {
  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.betterAuthOrganizationId, betterAuthOrganizationId),
  });
  if (!orgRow) {
    return null;
  }

  const [row] = await db
    .select({ last: max(analyses.completedAt) })
    .from(analyses)
    .where(
      and(
        eq(analyses.organizationId, orgRow.id),
        eq(analyses.status, "completed"),
      ),
    );

  const last = row?.last;
  if (!last) {
    return null;
  }
  return formatLastAnalysisLabel(last);
}
