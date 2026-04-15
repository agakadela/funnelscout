import { describe, expect, it } from "vitest";

import { needsGhlOAuthReconnect } from "@/lib/ghl/reconnect-state";

describe("needsGhlOAuthReconnect", () => {
  const base = {
    ghlAgencyId: "agency-1",
    ghlAccessToken: "enc-access",
    ghlRefreshToken: "enc-refresh",
    ghlTokenExpiresAt: new Date(2_000_000_000_000),
  };

  it("returns false when there is no GHL agency id", () => {
    expect(
      needsGhlOAuthReconnect({ ...base, ghlAgencyId: null }, 1_000_000_000_000),
    ).toBe(false);
  });

  it("returns true when agency is set but access token is missing", () => {
    expect(
      needsGhlOAuthReconnect(
        { ...base, ghlAccessToken: null },
        1_000_000_000_000,
      ),
    ).toBe(true);
  });

  it("returns true when refresh token is missing", () => {
    expect(
      needsGhlOAuthReconnect(
        { ...base, ghlRefreshToken: null },
        1_000_000_000_000,
      ),
    ).toBe(true);
  });

  it("returns true when expiry is null", () => {
    expect(
      needsGhlOAuthReconnect(
        { ...base, ghlTokenExpiresAt: null },
        1_000_000_000_000,
      ),
    ).toBe(true);
  });

  it("returns true when expiry is not after now", () => {
    const now = 1_700_000_000_000;
    expect(
      needsGhlOAuthReconnect(
        { ...base, ghlTokenExpiresAt: new Date(now) },
        now,
      ),
    ).toBe(true);
    expect(
      needsGhlOAuthReconnect(
        { ...base, ghlTokenExpiresAt: new Date(now - 1) },
        now,
      ),
    ).toBe(true);
  });

  it("returns false when tokens exist and expiry is in the future", () => {
    const now = 1_700_000_000_000;
    expect(
      needsGhlOAuthReconnect(
        { ...base, ghlTokenExpiresAt: new Date(now + 60_000) },
        now,
      ),
    ).toBe(false);
  });
});
