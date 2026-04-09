import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildGhlAuthorizeUrl, createSignedOAuthState } from "@/lib/ghl/oauth";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
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
