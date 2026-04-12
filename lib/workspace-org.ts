import { eq } from "drizzle-orm";

import { organization as betterAuthOrganization } from "@/drizzle/better-auth-schema";
import { organizations } from "@/drizzle/schema";
import { db } from "@/lib/db";

export async function ensureAppOrganizationForBetterAuthOrg(input: {
  betterAuthOrganizationId: string;
}): Promise<{ id: string }> {
  const existing = await db.query.organizations.findFirst({
    where: eq(
      organizations.betterAuthOrganizationId,
      input.betterAuthOrganizationId,
    ),
  });
  if (existing) {
    return { id: existing.id };
  }

  const [baOrg] = await db
    .select({ name: betterAuthOrganization.name })
    .from(betterAuthOrganization)
    .where(eq(betterAuthOrganization.id, input.betterAuthOrganizationId))
    .limit(1);

  const name = baOrg?.name ?? "Agency";

  const [row] = await db
    .insert(organizations)
    .values({
      name,
      betterAuthOrganizationId: input.betterAuthOrganizationId,
    })
    .onConflictDoNothing({
      target: organizations.betterAuthOrganizationId,
    })
    .returning({ id: organizations.id });

  if (row) {
    return { id: row.id };
  }

  const afterConflict = await db.query.organizations.findFirst({
    where: eq(
      organizations.betterAuthOrganizationId,
      input.betterAuthOrganizationId,
    ),
  });
  if (!afterConflict) {
    throw new Error("Failed to create workspace organization");
  }

  return { id: afterConflict.id };
}
