import { describe, expect, it } from "vitest";

import { weeklyDigestAllowedByOrganizationPreferences } from "@/lib/analysis/weekly-digest-after-analysis";

describe("weeklyDigestAllowedByOrganizationPreferences", () => {
  it("returns true only when both preferences are true", () => {
    expect(
      weeklyDigestAllowedByOrganizationPreferences({
        preferencesWeeklyDigestEnabled: true,
        preferencesEmailNotificationsEnabled: true,
      }),
    ).toBe(true);
  });

  it("returns false when weekly digest is off", () => {
    expect(
      weeklyDigestAllowedByOrganizationPreferences({
        preferencesWeeklyDigestEnabled: false,
        preferencesEmailNotificationsEnabled: true,
      }),
    ).toBe(false);
  });

  it("returns false when email notifications are off even if digest is on", () => {
    expect(
      weeklyDigestAllowedByOrganizationPreferences({
        preferencesWeeklyDigestEnabled: true,
        preferencesEmailNotificationsEnabled: false,
      }),
    ).toBe(false);
  });

  it("returns false when both are off", () => {
    expect(
      weeklyDigestAllowedByOrganizationPreferences({
        preferencesWeeklyDigestEnabled: false,
        preferencesEmailNotificationsEnabled: false,
      }),
    ).toBe(false);
  });
});
