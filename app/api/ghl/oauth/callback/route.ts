import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { organization as betterAuthOrganization } from "@/drizzle/better-auth-schema";
import { organizations } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  encryptGhlToken,
  exchangeAuthorizationCode,
  parseSignedOAuthState,
} from "@/lib/ghl/oauth";
import { inngest } from "@/inngest/client";

function errorRedirect(request: NextRequest, message: string): NextResponse {
  const params = new URLSearchParams({ ghl_error: message });
  return NextResponse.redirect(
    new URL(`/dashboard?${params.toString()}`, request.nextUrl.origin),
  );
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  if (error) {
    return errorRedirect(
      request,
      searchParams.get("error_description") ?? error,
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return errorRedirect(request, "missing_code_or_state");
  }

  const statePayload = parseSignedOAuthState(state);
  if (!statePayload) {
    return errorRedirect(request, "invalid_state");
  }

  if (statePayload.o !== session.session.activeOrganizationId) {
    return errorRedirect(request, "state_organization_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code);
  } catch {
    return errorRedirect(request, "token_exchange_failed");
  }

  const betterAuthOrganizationId = statePayload.o;
  const [baOrg] = await db
    .select()
    .from(betterAuthOrganization)
    .where(eq(betterAuthOrganization.id, betterAuthOrganizationId))
    .limit(1);

  const agencyName = baOrg?.name ?? "Agency";
  const companyId = tokens.companyId ?? null;

  const encryptedAccess = encryptGhlToken(tokens.accessToken);
  const encryptedRefresh = encryptGhlToken(tokens.refreshToken);
  const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);

  const [upserted] = await db
    .insert(organizations)
    .values({
      name: agencyName,
      betterAuthOrganizationId,
      ghlAgencyId: companyId,
      ghlAccessToken: encryptedAccess,
      ghlRefreshToken: encryptedRefresh,
      ghlTokenExpiresAt: expiresAt,
    })
    .onConflictDoUpdate({
      target: organizations.betterAuthOrganizationId,
      set: {
        ghlAccessToken: encryptedAccess,
        ghlRefreshToken: encryptedRefresh,
        ghlTokenExpiresAt: expiresAt,
        ...(companyId ? { ghlAgencyId: companyId } : {}),
        updatedAt: new Date(),
      },
    })
    .returning({ id: organizations.id });

  const organizationId = upserted?.id;
  if (!organizationId) {
    return errorRedirect(request, "organization_upsert_failed");
  }

  try {
    await inngest.send({
      id: `ghl-oauth-connected-${organizationId}`,
      name: "ghl/oauth.connected",
      data: { organizationId },
    });
  } catch {
    // Tokens saved — redirect anyway; backfill will require manual re-trigger
  }

  return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
}
