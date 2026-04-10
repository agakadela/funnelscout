import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GHL_OAUTH_AUTHORIZE_URL,
  buildGhlAuthorizeUrl,
  createSignedOAuthState,
  parseSignedOAuthState,
} from "@/lib/ghl/oauth";

describe("GHL OAuth helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("buildGhlAuthorizeUrl includes required query parameters", () => {
    const url = buildGhlAuthorizeUrl("state-token-abc");
    expect(url.startsWith(`${GHL_OAUTH_AUTHORIZE_URL}?`)).toBe(true);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBeTruthy();
    expect(parsed.searchParams.get("redirect_uri")).toBeTruthy();
    expect(parsed.searchParams.get("scope")).toContain(
      "opportunities.readonly",
    );
    expect(parsed.searchParams.get("state")).toBe("state-token-abc");
  });

  it("createSignedOAuthState round-trips through parseSignedOAuthState", () => {
    const state = createSignedOAuthState("better-auth-org-id");
    const parsed = parseSignedOAuthState(state);
    expect(parsed).toEqual({
      o: "better-auth-org-id",
      t: expect.any(Number),
    });
  });

  it("parseSignedOAuthState returns null when the signature is wrong", () => {
    const state = createSignedOAuthState("org-1");
    const [payload, sig] = state.split(".");
    if (!payload || !sig) {
      throw new Error("expected payload and signature segments");
    }
    const tampered = `${payload}.${sig.slice(0, -1)}x`;
    expect(parseSignedOAuthState(tampered)).toBeNull();
  });

  it("parseSignedOAuthState returns null when the state is older than 15 minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00.000Z"));
    const state = createSignedOAuthState("org-1");
    vi.setSystemTime(new Date("2026-04-01T12:20:00.000Z"));
    expect(parseSignedOAuthState(state)).toBeNull();
  });
});
