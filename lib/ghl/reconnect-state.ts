export type GhlReconnectOrgFields = {
  ghlAgencyId: string | null;
  ghlAccessToken: string | null;
  ghlRefreshToken: string | null;
  ghlTokenExpiresAt: Date | null;
};

/**
 * True when the workspace was linked to a GHL agency but tokens are missing
 * or no longer valid (expired calendar time). Matches UI for "reconnect OAuth".
 */
export function needsGhlOAuthReconnect(
  org: GhlReconnectOrgFields,
  nowMs: number = Date.now(),
): boolean {
  if (!org.ghlAgencyId) {
    return false;
  }
  if (!org.ghlAccessToken || !org.ghlRefreshToken) {
    return true;
  }
  if (!org.ghlTokenExpiresAt) {
    return true;
  }
  return org.ghlTokenExpiresAt.getTime() <= nowMs;
}
