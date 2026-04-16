import { eq } from "drizzle-orm";

import { organizations } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  type OrganizationPreferencesPayload,
  organizationPreferencesPayloadSchema,
} from "@/lib/settings/preferences-validation";

export async function loadOrganizationPreferences(
  organizationId: string,
): Promise<OrganizationPreferencesPayload | null> {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: {
      preferencesEmailNotificationsEnabled: true,
      preferencesWeeklyDigestEnabled: true,
      preferencesTimezone: true,
      preferencesDigestDayOfWeek: true,
      preferencesDigestLocalHour: true,
    },
  });

  if (!row) {
    return null;
  }

  const payload: OrganizationPreferencesPayload = {
    emailNotificationsEnabled: row.preferencesEmailNotificationsEnabled,
    weeklyDigestEnabled: row.preferencesWeeklyDigestEnabled,
    timezone: row.preferencesTimezone,
    digestDayOfWeek: row.preferencesDigestDayOfWeek,
    digestLocalHour: row.preferencesDigestLocalHour,
  };

  return organizationPreferencesPayloadSchema.parse(payload);
}
