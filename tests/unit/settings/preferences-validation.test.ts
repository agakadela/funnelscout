import { describe, expect, it } from "vitest";

import {
  DIGEST_DAY_OPTIONS,
  formatDigestHourLabel,
  getSortedIanaTimeZones,
  isValidIanaTimezone,
  organizationPreferencesPayloadSchema,
} from "@/lib/settings/preferences-validation";

describe("isValidIanaTimezone", () => {
  it("accepts UTC", () => {
    expect(isValidIanaTimezone("UTC")).toBe(true);
  });

  it("accepts America/New_York", () => {
    expect(isValidIanaTimezone("America/New_York")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidIanaTimezone("")).toBe(false);
  });

  it("rejects invalid zone id", () => {
    expect(isValidIanaTimezone("Not/AZone")).toBe(false);
  });

  it("rejects strings over 100 chars", () => {
    expect(isValidIanaTimezone(`${"x".repeat(101)}`)).toBe(false);
  });
});

describe("organizationPreferencesPayloadSchema", () => {
  it("parses a valid payload", () => {
    const data = {
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: false,
      timezone: "UTC",
      digestDayOfWeek: 3,
      digestLocalHour: 14,
    };
    expect(() =>
      organizationPreferencesPayloadSchema.parse(data),
    ).not.toThrow();
  });

  it("rejects invalid timezone", () => {
    const parsed = organizationPreferencesPayloadSchema.safeParse({
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: true,
      timezone: "Invalid/Zone",
      digestDayOfWeek: 1,
      digestLocalHour: 9,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects digest hour out of range", () => {
    const parsed = organizationPreferencesPayloadSchema.safeParse({
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: true,
      timezone: "UTC",
      digestDayOfWeek: 0,
      digestLocalHour: 24,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects digest day out of range", () => {
    const parsed = organizationPreferencesPayloadSchema.safeParse({
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: true,
      timezone: "UTC",
      digestDayOfWeek: 7,
      digestLocalHour: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = organizationPreferencesPayloadSchema.safeParse({
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: true,
      timezone: "UTC",
      digestDayOfWeek: 1,
      digestLocalHour: 9,
      extra: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("getSortedIanaTimeZones", () => {
  it("returns a non-empty sorted list including UTC", () => {
    const zones = getSortedIanaTimeZones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones.includes("UTC")).toBe(true);
    const sorted = [...zones].sort((a, b) => a.localeCompare(b));
    expect(zones).toEqual(sorted);
  });
});

describe("formatDigestHourLabel", () => {
  it("formats midnight", () => {
    expect(formatDigestHourLabel(0)).toMatch(/12/i);
  });
});

describe("DIGEST_DAY_OPTIONS", () => {
  it("covers seven days 0–6", () => {
    expect(DIGEST_DAY_OPTIONS).toHaveLength(7);
    const values = DIGEST_DAY_OPTIONS.map((d) => d.value);
    expect(values).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
