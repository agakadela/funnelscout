import { describe, expect, it } from "vitest";
import { GhlOAuthTokenResponseSchema } from "@/lib/ghl/types";

describe("GhlOAuthTokenResponseSchema", () => {
  it("accepts snake_case fields and maps to camelCase", () => {
    const parsed = GhlOAuthTokenResponseSchema.safeParse({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.accessToken).toBe("access");
      expect(parsed.data.refreshToken).toBe("refresh");
      expect(parsed.data.expiresInSeconds).toBe(3600);
    }
  });

  it("normalizes company_id and location_id aliases", () => {
    const parsed = GhlOAuthTokenResponseSchema.safeParse({
      access_token: "a",
      refresh_token: "r",
      expires_in: 1,
      company_id: "comp-1",
      location_id: "loc-1",
      user_type: "Company",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.companyId).toBe("comp-1");
      expect(parsed.data.locationId).toBe("loc-1");
      expect(parsed.data.userType).toBe("Company");
    }
  });

  it("rejects responses missing required token fields", () => {
    const parsed = GhlOAuthTokenResponseSchema.safeParse({
      access_token: "only-access",
      expires_in: 100,
    });
    expect(parsed.success).toBe(false);
  });
});
