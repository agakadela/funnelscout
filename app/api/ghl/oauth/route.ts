import { NextResponse } from "next/server";

import { getCachedAuthSession } from "@/lib/auth-session";
import { buildGhlAuthorizeUrl, createSignedOAuthState } from "@/lib/ghl/oauth";

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
  const state = createSignedOAuthState(betterAuthOrganizationId);
  const url = buildGhlAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
