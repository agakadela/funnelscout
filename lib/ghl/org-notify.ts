import { and, eq } from "drizzle-orm";
import { member, user } from "@/drizzle/better-auth-schema";
import { db } from "@/lib/db";

export async function getOwnerEmailForBetterAuthOrganization(
  betterAuthOrganizationId: string,
): Promise<string | null> {
  const rows = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, betterAuthOrganizationId),
        eq(member.role, "owner"),
      ),
    )
    .limit(1);
  return rows[0]?.email ?? null;
}
