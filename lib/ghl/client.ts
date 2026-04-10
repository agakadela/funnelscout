import { eq } from "drizzle-orm";
import { organizations } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  decryptGhlToken,
  encryptGhlToken,
  refreshAccessToken,
} from "@/lib/ghl/oauth";
import {
  GhlLocationSearchResponseSchema,
  GhlOpportunitySearchResponseSchema,
  type GhlOpportunityRecord,
} from "@/lib/ghl/types";
import { sendGhlTokenRefreshFailedEmail } from "@/lib/resend";
import { getOwnerEmailForBetterAuthOrganization } from "@/lib/ghl/org-notify";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

function ghlHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function loadOrgGhlRow(organizationId: string) {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  if (!row) {
    throw new Error("Organization not found");
  }
  const accessEnc = row.ghlAccessToken;
  const refreshEnc = row.ghlRefreshToken;
  if (!accessEnc || !refreshEnc) {
    throw new Error("GoHighLevel is not connected for this organization");
  }
  return {
    ...row,
    ghlAccessToken: accessEnc,
    ghlRefreshToken: refreshEnc,
  } as typeof row & {
    ghlAccessToken: string;
    ghlRefreshToken: string;
  };
}

function expiresWithinWindow(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - Date.now() < TOKEN_REFRESH_WINDOW_MS;
}

async function persistRefreshedTokens(
  organizationId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<void> {
  await db
    .update(organizations)
    .set({
      ghlAccessToken: encryptGhlToken(accessToken),
      ghlRefreshToken: encryptGhlToken(refreshToken),
      ghlTokenExpiresAt: expiresAt,
    })
    .where(eq(organizations.id, organizationId));
}

async function markOrgGhlDisconnected(organizationId: string): Promise<void> {
  await db
    .update(organizations)
    .set({
      ghlAccessToken: null,
      ghlRefreshToken: null,
      ghlTokenExpiresAt: null,
    })
    .where(eq(organizations.id, organizationId));
}

async function notifyRefreshFailure(organizationId: string): Promise<void> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  if (!org?.betterAuthOrganizationId) return;
  const email = await getOwnerEmailForBetterAuthOrganization(
    org.betterAuthOrganizationId,
  );
  if (!email) return;
  try {
    await sendGhlTokenRefreshFailedEmail({
      to: email,
      organizationName: org.name,
    });
  } catch {
    /* delivery failure should not mask the disconnect state */
  }
}

export async function getValidGhlAccessToken(
  organizationId: string,
): Promise<string> {
  const row = await loadOrgGhlRow(organizationId);
  let accessToken = decryptGhlToken(row.ghlAccessToken);
  const refreshToken = decryptGhlToken(row.ghlRefreshToken);

  if (!expiresWithinWindow(row.ghlTokenExpiresAt)) {
    return accessToken;
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
    await persistRefreshedTokens(
      organizationId,
      refreshed.accessToken,
      refreshed.refreshToken,
      expiresAt,
    );
    accessToken = refreshed.accessToken;
  } catch {
    await markOrgGhlDisconnected(organizationId);
    await notifyRefreshFailure(organizationId);
    throw new Error("GoHighLevel token refresh failed — reconnect required");
  }

  return accessToken;
}

export async function fetchCompanyLocations(
  organizationId: string,
  companyId: string,
): Promise<{ id: string; name: string }[]> {
  const accessToken = await getValidGhlAccessToken(organizationId);
  const res = await fetch(`${GHL_API_BASE}/locations/search`, {
    method: "POST",
    headers: ghlHeaders(accessToken),
    body: JSON.stringify({ companyId }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GHL locations search failed: ${res.status} ${text}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("GHL locations search returned non-JSON");
  }
  const parsed = GhlLocationSearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error("GHL locations response failed validation", parsed.error.flatten());
    return [];
  }
  return (parsed.data.locations ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name ?? loc.id,
  }));
}

export async function fetchOpportunities(
  organizationId: string,
  locationId: string,
  since: Date,
): Promise<GhlOpportunityRecord[]> {
  const accessToken = await getValidGhlAccessToken(organizationId);
  const all: GhlOpportunityRecord[] = [];
  let page = 1;
  const pageLimit = 100;

  for (;;) {
    const res = await fetch(`${GHL_API_BASE}/opportunities/search`, {
      method: "POST",
      headers: ghlHeaders(accessToken),
      body: JSON.stringify({
        locationId,
        limit: pageLimit,
        page,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`GHL opportunities search failed: ${res.status} ${text}`);
    }
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error("GHL opportunities search returned non-JSON");
    }
    const parsed = GhlOpportunitySearchResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.error("GHL opportunities response failed validation", parsed.error.flatten());
    }
    const batch = parsed.success ? (parsed.data.opportunities ?? []) : [];
    for (const opp of batch) {
      const createdRaw = opp.createdAt ?? opp.created_at;
      if (createdRaw) {
        const created = new Date(createdRaw);
        if (!Number.isNaN(created.getTime()) && created < since) {
          continue;
        }
      }
      all.push(opp);
    }
    if (batch.length < pageLimit) break;
    page += 1;
    if (page > 500) break;
  }

  return all;
}
