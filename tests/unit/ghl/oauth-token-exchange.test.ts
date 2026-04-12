import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

describe("lib/ghl/oauth token HTTP exchange", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchangeAuthorizationCode returns validated token payload on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "a1",
          refresh_token: "r1",
          expires_in: 7200,
        }),
        { status: 200 },
      ),
    );
    const { exchangeAuthorizationCode } = await import("@/lib/ghl/oauth");
    const out = await exchangeAuthorizationCode("auth-code-xyz");
    expect(out.accessToken).toBe("a1");
    expect(out.refreshToken).toBe("r1");
    expect(out.expiresInSeconds).toBe(7200);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init).toMatchObject({ method: "POST" });
    expect(String((init as RequestInit).body)).toContain(
      "grant_type=authorization_code",
    );
  });

  it("exchangeAuthorizationCode throws when token endpoint returns non-OK", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 401 }));
    const { exchangeAuthorizationCode } = await import("@/lib/ghl/oauth");
    await expect(exchangeAuthorizationCode("bad")).rejects.toThrow(
      "GHL token exchange failed: 401",
    );
  });

  it("exchangeAuthorizationCode throws when response is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("plain", { status: 200 }));
    const { exchangeAuthorizationCode } = await import("@/lib/ghl/oauth");
    await expect(exchangeAuthorizationCode("x")).rejects.toThrow(
      "GHL token exchange returned non-JSON body",
    );
  });

  it("exchangeAuthorizationCode throws when JSON does not match the schema", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "only" }), { status: 200 }),
    );
    const { exchangeAuthorizationCode } = await import("@/lib/ghl/oauth");
    await expect(exchangeAuthorizationCode("x")).rejects.toThrow(
      "GHL token exchange response failed validation",
    );
  });

  it("refreshAccessToken returns validated token payload on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "na",
          refresh_token: "nr",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );
    const { refreshAccessToken } = await import("@/lib/ghl/oauth");
    const out = await refreshAccessToken("refresh-secret");
    expect(out.accessToken).toBe("na");
    expect(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ).toContain("grant_type=refresh_token");
  });

  it("refreshAccessToken throws when token endpoint returns non-OK", async () => {
    fetchMock.mockResolvedValueOnce(new Response("err", { status: 400 }));
    const { refreshAccessToken } = await import("@/lib/ghl/oauth");
    await expect(refreshAccessToken("r")).rejects.toThrow(
      "GHL token refresh failed: 400",
    );
  });

  it("refreshAccessToken throws when response is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 200 }));
    const { refreshAccessToken } = await import("@/lib/ghl/oauth");
    await expect(refreshAccessToken("r")).rejects.toThrow(
      "GHL token refresh returned non-JSON body",
    );
  });

  it("refreshAccessToken throws when JSON does not match the schema", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ refresh_token: "r" }), { status: 200 }),
    );
    const { refreshAccessToken } = await import("@/lib/ghl/oauth");
    await expect(refreshAccessToken("r")).rejects.toThrow(
      "GHL token refresh response failed validation",
    );
  });
});
