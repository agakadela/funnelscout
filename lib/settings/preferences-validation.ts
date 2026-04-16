import { z } from "zod";

export function isValidIanaTimezone(value: string): boolean {
  if (value.length === 0 || value.length > 100) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const organizationPreferencesPayloadSchema = z
  .object({
    emailNotificationsEnabled: z.boolean(),
    weeklyDigestEnabled: z.boolean(),
    timezone: z
      .string()
      .min(1)
      .max(100)
      .refine(isValidIanaTimezone, { message: "Invalid IANA timezone" }),
    digestDayOfWeek: z.number().int().min(0).max(6),
    digestLocalHour: z.number().int().min(0).max(23),
  })
  .strict();

export type OrganizationPreferencesPayload = z.infer<
  typeof organizationPreferencesPayloadSchema
>;

export function getSortedIanaTimeZones(): string[] {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    const unique = new Set(zones);
    unique.add("UTC");
    return [...unique].sort((a, b) => a.localeCompare(b));
  } catch {
    return ["UTC"];
  }
}

export function formatDigestHourLabel(hour: number): string {
  const d = new Date(Date.UTC(2000, 0, 2, hour, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(d);
}

export const DIGEST_DAY_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
}> = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];
