import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: { findFirst: hoisted.findFirst },
    },
  },
}));

import { loadOrganizationPreferences } from "@/lib/settings/load-organization-preferences";

const ORG_ID = "org-load-prefs-1";

const validRow = {
  preferencesEmailNotificationsEnabled: true,
  preferencesWeeklyDigestEnabled: false,
  preferencesTimezone: "UTC",
  preferencesDigestDayOfWeek: 3,
  preferencesDigestLocalHour: 14,
};

describe("loadOrganizationPreferences", () => {
  beforeEach(() => {
    hoisted.findFirst.mockReset();
  });

  it("returns null when organization row is missing", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);
    const res = await loadOrganizationPreferences(ORG_ID);
    expect(res).toBeNull();
  });

  it("returns validated payload when row is valid", async () => {
    hoisted.findFirst.mockResolvedValue(validRow);
    const res = await loadOrganizationPreferences(ORG_ID);
    expect(res).toEqual({
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: false,
      timezone: "UTC",
      digestDayOfWeek: 3,
      digestLocalHour: 14,
    });
  });

  it("returns null when stored values fail schema validation", async () => {
    hoisted.findFirst.mockResolvedValue({
      ...validRow,
      preferencesTimezone: "Not/AZone",
    });
    const res = await loadOrganizationPreferences(ORG_ID);
    expect(res).toBeNull();
  });
});
