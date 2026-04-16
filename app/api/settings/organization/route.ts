import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { organizations } from "@/drizzle/schema";
import { getCachedAuthSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { loadOrganizationPreferences } from "@/lib/settings/load-organization-preferences";
import { organizationPreferencesPayloadSchema } from "@/lib/settings/preferences-validation";

export async function GET() {
  const session = await getCachedAuthSession();

  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const betterAuthOrganizationId = session.session.activeOrganizationId;
  if (!betterAuthOrganizationId) {
    return NextResponse.json(
      { error: "No active organization selected" },
      { status: 400 },
    );
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.betterAuthOrganizationId, betterAuthOrganizationId),
  });

  if (!orgRow) {
    return NextResponse.json(
      { error: "Organization is not linked to this workspace" },
      { status: 400 },
    );
  }

  const prefs = await loadOrganizationPreferences(orgRow.id);
  if (!prefs) {
    return NextResponse.json(
      { error: "Workspace could not be loaded" },
      { status: 404 },
    );
  }

  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await getCachedAuthSession();

  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const betterAuthOrganizationId = session.session.activeOrganizationId;
  if (!betterAuthOrganizationId) {
    return NextResponse.json(
      { error: "No active organization selected" },
      { status: 400 },
    );
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = organizationPreferencesPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.betterAuthOrganizationId, betterAuthOrganizationId),
  });

  if (!orgRow) {
    return NextResponse.json(
      { error: "Organization is not linked to this workspace" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const [updated] = await db
    .update(organizations)
    .set({
      preferencesEmailNotificationsEnabled: data.emailNotificationsEnabled,
      preferencesWeeklyDigestEnabled: data.weeklyDigestEnabled,
      preferencesTimezone: data.timezone,
      preferencesDigestDayOfWeek: data.digestDayOfWeek,
      preferencesDigestLocalHour: data.digestLocalHour,
    })
    .where(eq(organizations.id, orgRow.id))
    .returning({
      id: organizations.id,
    });

  if (!updated) {
    return NextResponse.json(
      { error: "Workspace could not be updated" },
      { status: 404 },
    );
  }

  const prefs = await loadOrganizationPreferences(orgRow.id);
  if (!prefs) {
    return NextResponse.json(
      { error: "Workspace could not be loaded" },
      { status: 404 },
    );
  }

  return NextResponse.json(prefs);
}
