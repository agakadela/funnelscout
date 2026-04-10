import { and, eq } from "drizzle-orm";
import { member, user } from "@/drizzle/better-auth-schema";
import { db } from "@/lib/db";

/**
 * Resolves a single recipient for transactional digests (owner first, else any member).
 */
export async function resolveDigestRecipientEmail(
  betterAuthOrganizationId: string,
): Promise<string | null> {
  const [owner] = await db
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

  if (owner?.email) {
    return owner.email;
  }

  const [anyMember] = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, betterAuthOrganizationId))
    .limit(1);

  return anyMember?.email ?? null;
}
