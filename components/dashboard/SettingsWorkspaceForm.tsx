"use client";

import { useCallback, useState } from "react";

import type { OrganizationPreferencesPayload } from "@/lib/settings/preferences-validation";
import {
  DIGEST_DAY_OPTIONS,
  formatDigestHourLabel,
  organizationPreferencesPayloadSchema,
} from "@/lib/settings/preferences-validation";

type SettingsWorkspaceFormProps = {
  initial: OrganizationPreferencesPayload;
  timezones: string[];
};

export function SettingsWorkspaceForm({
  initial,
  timezones,
}: SettingsWorkspaceFormProps) {
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    initial.emailNotificationsEnabled,
  );
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(
    initial.weeklyDigestEnabled,
  );
  const [timezone, setTimezone] = useState(initial.timezone);
  const [digestDayOfWeek, setDigestDayOfWeek] = useState(
    initial.digestDayOfWeek,
  );
  const [digestLocalHour, setDigestLocalHour] = useState(
    initial.digestLocalHour,
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    setSavedAt(null);
    const payload: OrganizationPreferencesPayload = {
      emailNotificationsEnabled,
      weeklyDigestEnabled,
      timezone,
      digestDayOfWeek,
      digestLocalHour,
    };
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "Could not save settings";
        setErrorMessage(err);
        return;
      }
      const parsedResponse =
        organizationPreferencesPayloadSchema.safeParse(json);
      if (!parsedResponse.success) {
        setErrorMessage("Invalid response from server");
        return;
      }
      const data = parsedResponse.data;
      setEmailNotificationsEnabled(data.emailNotificationsEnabled);
      setWeeklyDigestEnabled(data.weeklyDigestEnabled);
      setTimezone(data.timezone);
      setDigestDayOfWeek(data.digestDayOfWeek);
      setDigestLocalHour(data.digestLocalHour);
      setSavedAt(Date.now());
    } catch {
      setErrorMessage("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }, [
    digestDayOfWeek,
    digestLocalHour,
    emailNotificationsEnabled,
    timezone,
    weeklyDigestEnabled,
  ]);

  const digestScheduleDisabled = !weeklyDigestEnabled;

  const hourOptions = Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: formatDigestHourLabel(h),
  }));

  return (
    <div className="fs-card mt-6 p-8">
      <h2 className="fs-text-body font-semibold text-fs-primary">
        Notifications &amp; digest
      </h2>
      <p className="fs-text-small mt-1 text-fs-secondary">
        Control workspace email alerts and when the weekly summary is scheduled
        in your timezone.
      </p>

      <div className="mt-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="fs-text-body font-medium text-fs-primary">
              Email notifications
            </p>
            <p className="fs-text-small mt-1 max-w-md text-fs-secondary">
              Product and account emails such as billing receipts and security
              notices.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={emailNotificationsEnabled}
              onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-fs-border bg-fs-surface accent-fs-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fs-amber focus-visible:ring-offset-2 focus-visible:ring-offset-fs-bg"
            />
            <span className="fs-text-small text-fs-secondary">Enabled</span>
          </label>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="fs-text-body font-medium text-fs-primary">
              Weekly digest
            </p>
            <p className="fs-text-small mt-1 max-w-md text-fs-secondary">
              A single weekly email summarizing pipeline health across clients.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={weeklyDigestEnabled}
              onChange={(e) => setWeeklyDigestEnabled(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-fs-border bg-fs-surface accent-fs-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fs-amber focus-visible:ring-offset-2 focus-visible:ring-offset-fs-bg"
            />
            <span className="fs-text-small text-fs-secondary">Enabled</span>
          </label>
        </div>

        <div>
          <label htmlFor="settings-timezone" className="fs-input-label">
            Workspace timezone
          </label>
          <select
            id="settings-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="fs-input mt-2 max-w-xl"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="fs-text-caption mt-2 text-fs-faded">
            Used for digest send time and dates in reports.
          </p>
        </div>

        <div
          className={
            digestScheduleDisabled ? "pointer-events-none opacity-50" : ""
          }
          aria-disabled={digestScheduleDisabled}
        >
          <p className="fs-text-label text-fs-faded">Digest schedule</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="settings-digest-day" className="fs-input-label">
                Day
              </label>
              <select
                id="settings-digest-day"
                value={String(digestDayOfWeek)}
                onChange={(e) =>
                  setDigestDayOfWeek(Number.parseInt(e.target.value, 10))
                }
                disabled={digestScheduleDisabled}
                className="fs-input mt-2 w-full sm:max-w-xs"
              >
                {DIGEST_DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={String(d.value)}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="settings-digest-hour" className="fs-input-label">
                Local hour
              </label>
              <select
                id="settings-digest-hour"
                value={String(digestLocalHour)}
                onChange={(e) =>
                  setDigestLocalHour(Number.parseInt(e.target.value, 10))
                }
                disabled={digestScheduleDisabled}
                className="fs-input mt-2 w-full sm:max-w-xs"
              >
                {hourOptions.map((h) => (
                  <option key={h.value} value={String(h.value)}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {digestScheduleDisabled ? (
            <p className="fs-text-caption mt-2 text-fs-faded">
              Turn on weekly digest to edit the schedule.
            </p>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div
          className="mt-6 rounded-md border border-fs-border bg-fs-red-bg px-4 py-3"
          role="alert"
        >
          <p className="fs-text-small font-medium text-fs-red">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="fs-btn-outline mt-3 px-4 py-2 text-fs-caption"
          >
            Retry save
          </button>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="fs-btn-primary px-5 py-2.5"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedAt !== null && !errorMessage ? (
          <p className="fs-text-caption text-fs-green" role="status">
            Saved
          </p>
        ) : null}
      </div>
    </div>
  );
}
