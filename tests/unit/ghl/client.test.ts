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

import { fetchCompanyLocations, fetchOpportunities } from "@/lib/ghl/client";

describe("lib/ghl/client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", hoisted.fetchMock);
    hoisted.findFirstOrg.mockResolvedValue({
      ghlAccessToken: "enc-access",
      ghlRefreshToken: "enc-refresh",
      ghlTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    hoisted.fetchMock.mockReset();
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
});
