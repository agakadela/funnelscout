import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getCachedAuthSession: vi.fn(),
  findOrg: vi.fn(),
  loadOrganizationPreferences: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getCachedAuthSession: hoisted.getCachedAuthSession,
}));

vi.mock("@/lib/settings/load-organization-preferences", () => ({
  loadOrganizationPreferences: hoisted.loadOrganizationPreferences,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: { findFirst: hoisted.findOrg },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: hoisted.returning,
        })),
      })),
    })),
  },
}));

import { GET, PATCH } from "@/app/api/settings/organization/route";

const ORG_ID = "org-prefs-1";
const BA_ORG_ID = "ba-org-prefs-1";

const validPrefs = {
  emailNotificationsEnabled: true,
  weeklyDigestEnabled: false,
  timezone: "UTC",
  digestDayOfWeek: 2,
  digestLocalHour: 14,
};

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/settings/organization", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/settings/organization", () => {
  beforeEach(() => {
    hoisted.getCachedAuthSession.mockReset();
    hoisted.findOrg.mockReset();
    hoisted.loadOrganizationPreferences.mockReset();

    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: BA_ORG_ID },
    });
    hoisted.findOrg.mockResolvedValue({
      id: ORG_ID,
      betterAuthOrganizationId: BA_ORG_ID,
    });
    hoisted.loadOrganizationPreferences.mockResolvedValue(validPrefs);
  });

  it("returns 401 when there is no session", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 400 when active organization is missing", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: null },
    });
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it("returns 400 when organization row is missing", async () => {
    hoisted.findOrg.mockResolvedValue(undefined);
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it("returns 404 when preferences cannot be loaded", async () => {
    hoisted.loadOrganizationPreferences.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 200 with preferences payload", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as typeof validPrefs;
    expect(json).toEqual(validPrefs);
    expect(hoisted.loadOrganizationPreferences).toHaveBeenCalledWith(ORG_ID);
  });
});

describe("PATCH /api/settings/organization", () => {
  beforeEach(() => {
    hoisted.getCachedAuthSession.mockReset();
    hoisted.findOrg.mockReset();
    hoisted.loadOrganizationPreferences.mockReset();
    hoisted.returning.mockReset();

    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: BA_ORG_ID },
    });
    hoisted.findOrg.mockResolvedValue({
      id: ORG_ID,
      betterAuthOrganizationId: BA_ORG_ID,
    });
    hoisted.loadOrganizationPreferences.mockResolvedValue(validPrefs);
    hoisted.returning.mockResolvedValue([{ id: ORG_ID }]);
  });

  it("returns 401 when there is no session", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue(null);
    const res = await PATCH(patchRequest(validPrefs));
    expect(res.status).toBe(401);
  });

  it("returns 400 when active organization is missing", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: null },
    });
    const res = await PATCH(patchRequest(validPrefs));
    expect(res.status).toBe(400);
  });

  it("returns 422 when body fails schema validation", async () => {
    const res = await PATCH(
      patchRequest({
        ...validPrefs,
        digestLocalHour: 24,
      }),
    );
    expect(res.status).toBe(422);
  });

  it("returns 400 when organization row is missing", async () => {
    hoisted.findOrg.mockResolvedValue(undefined);
    const res = await PATCH(patchRequest(validPrefs));
    expect(res.status).toBe(400);
  });

  it("returns 404 when update affects no row", async () => {
    hoisted.returning.mockResolvedValue([]);
    const res = await PATCH(patchRequest(validPrefs));
    expect(res.status).toBe(404);
  });

  it("returns 404 when preferences cannot be reloaded after update", async () => {
    hoisted.loadOrganizationPreferences.mockResolvedValue(null);
    const res = await PATCH(patchRequest(validPrefs));
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated preferences", async () => {
    const updated = { ...validPrefs, weeklyDigestEnabled: true };
    hoisted.loadOrganizationPreferences.mockResolvedValue(updated);
    const res = await PATCH(patchRequest(validPrefs));
    expect(res.status).toBe(200);
    const json = (await res.json()) as typeof validPrefs;
    expect(json).toEqual(updated);
  });
});
