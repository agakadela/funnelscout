import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  findFirstOrg: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendGhlTokenRefreshFailedEmail: vi.fn(),
}));

vi.mock("@/lib/ghl/org-notify", () => ({
  getOwnerEmailForBetterAuthOrganization: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: {
        findFirst: hoisted.findFirstOrg,
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

vi.mock("@/lib/ghl/oauth", () => ({
  decryptGhlToken: vi.fn((enc: string) => {
    if (enc === "enc-access") return "plain-access";
    if (enc === "enc-refresh") return "plain-refresh";
    throw new Error("unexpected ciphertext in test");
  }),
  encryptGhlToken: vi.fn((plain: string) => `enc:${plain}`),
  refreshAccessToken: vi.fn(),
}));

import {
  fetchCompanyLocations,
  fetchOpportunities,
  getValidGhlAccessToken,
} from "@/lib/ghl/client";
import { refreshAccessToken } from "@/lib/ghl/oauth";

describe("lib/ghl/client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", hoisted.fetchMock);
    hoisted.findFirstOrg.mockResolvedValue({
      ghlAccessToken: "enc-access",
      ghlRefreshToken: "enc-refresh",
      ghlTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    hoisted.fetchMock.mockReset();
    vi.mocked(refreshAccessToken).mockReset();
  });

  it("fetchCompanyLocations posts companyId and maps locations", async () => {
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ locations: [{ id: "l1", name: "Alpha" }] }),
        { status: 200 },
      ),
    );

    const rows = await fetchCompanyLocations("org-1", "company-1");

    expect(rows).toEqual([{ id: "l1", name: "Alpha" }]);
    expect(hoisted.fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = hoisted.fetchMock.mock.calls[0] ?? [];
    expect(init).toMatchObject({ method: "POST" });
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({ companyId: "company-1" });
  });

  it("fetchOpportunities drops opportunities created strictly before since", async () => {
    const since = new Date("2026-02-01T00:00:00.000Z");
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          opportunities: [
            { id: "old", created_at: "2026-01-01T00:00:00.000Z" },
            { id: "new", createdAt: "2026-02-15T00:00:00.000Z" },
          ],
        }),
        { status: 200 },
      ),
    );

    const list = await fetchOpportunities("org-1", "loc-1", since);

    expect(list.map((o) => o.id)).toEqual(["new"]);
  });

  it("fetchOpportunities follows pagination until a partial page", async () => {
    const since = new Date("2020-01-01T00:00:00.000Z");
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      id: `p1-${i}`,
      createdAt: "2026-03-01T00:00:00.000Z",
    }));
    const page2 = [{ id: "p2-last", createdAt: "2026-03-02T00:00:00.000Z" }];
    hoisted.fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ opportunities: page1 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ opportunities: page2 }), { status: 200 }),
      );

    const list = await fetchOpportunities("org-1", "loc-1", since);

    expect(list).toHaveLength(101);
    expect(hoisted.fetchMock).toHaveBeenCalledTimes(2);
    const secondInit = hoisted.fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(secondInit.body)).page).toBe(2);
  });

  it("getValidGhlAccessToken returns decrypted access token when expiry is outside refresh window", async () => {
    const token = await getValidGhlAccessToken("org-1");
    expect(token).toBe("plain-access");
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("getValidGhlAccessToken refreshes and returns new access token when expiry is inside refresh window", async () => {
    hoisted.findFirstOrg.mockResolvedValue({
      ghlAccessToken: "enc-access",
      ghlRefreshToken: "enc-refresh",
      ghlTokenExpiresAt: new Date(Date.now() + 30 * 1000),
      betterAuthOrganizationId: "ba-org",
      name: "Agency",
    });
    vi.mocked(refreshAccessToken).mockResolvedValue({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      expiresInSeconds: 3600,
      companyId: undefined,
      locationId: undefined,
      userType: undefined,
    });

    const token = await getValidGhlAccessToken("org-1");

    expect(token).toBe("rotated-access");
    expect(refreshAccessToken).toHaveBeenCalledWith("plain-refresh");
  });

  it("getValidGhlAccessToken throws when organization is missing", async () => {
    hoisted.findFirstOrg.mockResolvedValueOnce(null);
    await expect(getValidGhlAccessToken("missing")).rejects.toThrow(
      "Organization not found",
    );
  });

  it("getValidGhlAccessToken throws when GHL tokens are not stored", async () => {
    hoisted.findFirstOrg.mockResolvedValueOnce({
      ghlAccessToken: null,
      ghlRefreshToken: null,
      ghlTokenExpiresAt: null,
    });
    await expect(getValidGhlAccessToken("org-1")).rejects.toThrow(
      "GoHighLevel is not connected for this organization",
    );
  });

  it("getValidGhlAccessToken disconnects and throws when token refresh fails", async () => {
    hoisted.findFirstOrg
      .mockResolvedValueOnce({
        ghlAccessToken: "enc-access",
        ghlRefreshToken: "enc-refresh",
        ghlTokenExpiresAt: null,
        betterAuthOrganizationId: "ba-1",
        name: "O",
      })
      .mockResolvedValueOnce({
        ghlAccessToken: "enc-access",
        ghlRefreshToken: "enc-refresh",
        ghlTokenExpiresAt: null,
        betterAuthOrganizationId: "ba-1",
        name: "O",
      });
    vi.mocked(refreshAccessToken).mockRejectedValueOnce(
      new Error("refresh up"),
    );

    await expect(getValidGhlAccessToken("org-1")).rejects.toThrow(
      "GoHighLevel token refresh failed — reconnect required",
    );
  });

  it("fetchCompanyLocations throws when GHL responds with a non-OK status", async () => {
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response("bad", { status: 502, statusText: "Bad Gateway" }),
    );
    await expect(fetchCompanyLocations("org-1", "co-1")).rejects.toThrow(
      "GHL locations search failed: 502",
    );
  });

  it("fetchCompanyLocations throws when response body is not JSON", async () => {
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response("not-json", { status: 200 }),
    );
    await expect(fetchCompanyLocations("org-1", "co-1")).rejects.toThrow(
      "GHL locations search returned non-JSON",
    );
  });

  it("fetchCompanyLocations returns an empty list when response fails Zod validation", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ locations: "not-an-array" }), {
        status: 200,
      }),
    );
    await expect(fetchCompanyLocations("org-1", "co-1")).resolves.toEqual([]);
    spy.mockRestore();
  });

  it("fetchOpportunities throws when GHL responds with a non-OK status", async () => {
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response("err", { status: 503, statusText: "Service Unavailable" }),
    );
    await expect(
      fetchOpportunities("org-1", "loc-1", new Date("2020-01-01")),
    ).rejects.toThrow("GHL opportunities search failed: 503");
  });

  it("fetchOpportunities throws when response body is not JSON", async () => {
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response("<<", { status: 200 }),
    );
    await expect(
      fetchOpportunities("org-1", "loc-1", new Date("2020-01-01")),
    ).rejects.toThrow("GHL opportunities search returned non-JSON");
  });

  it("fetchOpportunities yields no opportunities when search JSON fails validation", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    hoisted.fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ opportunities: "bad" }), { status: 200 }),
    );
    const list = await fetchOpportunities(
      "org-1",
      "loc-1",
      new Date("2020-01-01"),
    );
    expect(list).toEqual([]);
    spy.mockRestore();
  });
});
