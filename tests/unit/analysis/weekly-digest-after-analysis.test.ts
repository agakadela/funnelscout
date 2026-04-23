import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  findAnalysis: vi.fn(),
  findOrg: vi.fn(),
  findSub: vi.fn(),
  resolveRecipient: vi.fn(),
  sendDigest: vi.fn(),
}));

vi.mock("@/lib/analysis/digest-recipient", () => ({
  resolveDigestRecipientEmail: hoisted.resolveRecipient,
}));

vi.mock("@sentry/nextjs", () => ({
  withScope: (
    fn: (s: { setTag: () => void; setContext: () => void }) => void,
  ) => fn({ setTag: vi.fn(), setContext: vi.fn() }),
  captureException: vi.fn(),
}));

import { runWeeklyDigestAfterAnalysis } from "@/lib/analysis/weekly-digest-after-analysis";

const minimalReport = {
  metrics: {
    headline: "h",
    periodDescription: "p",
    kpis: [{ label: "L", value: "1" }],
    summary: "s",
  },
  anomalies: { anomalies: [] },
  recommendations: {
    recommendations: [{ title: "T", body: "B", impact: "high" }],
  },
};

const orgId = "org-ws-1";
const analysisId = "ana-1";
const subId = "sub-1";

function mockDb() {
  return {
    query: {
      analyses: { findFirst: hoisted.findAnalysis },
      organizations: { findFirst: hoisted.findOrg },
      subAccounts: { findFirst: hoisted.findSub },
    },
  } as const;
}

describe("runWeeklyDigestAfterAnalysis", () => {
  beforeEach(() => {
    hoisted.findAnalysis.mockReset();
    hoisted.findOrg.mockReset();
    hoisted.findSub.mockReset();
    hoisted.resolveRecipient.mockReset();
    hoisted.sendDigest.mockReset();

    hoisted.findAnalysis.mockResolvedValue({
      status: "completed",
      reportJson: minimalReport,
    });
    hoisted.findOrg.mockResolvedValue({
      id: orgId,
      name: "Agency",
      betterAuthOrganizationId: "ba-1",
      preferencesWeeklyDigestEnabled: true,
      preferencesEmailNotificationsEnabled: true,
    });
    hoisted.findSub.mockResolvedValue({
      name: "Client A",
      ghlLocationId: "loc-1",
    });
    hoisted.resolveRecipient.mockResolvedValue("verified@example.com");
    hoisted.sendDigest.mockResolvedValue(undefined);
  });

  it("happy path: sends digest when preferences allow and recipient resolves", async () => {
    const result = await runWeeklyDigestAfterAnalysis({
      organizationId: orgId,
      analysisId,
      subAccountId: subId,
      db: mockDb() as never,
      sendWeeklyDigestEmail: hoisted.sendDigest,
    });

    expect(result).toEqual({ sent: true });
    expect(hoisted.sendDigest).toHaveBeenCalledTimes(1);
    expect(hoisted.sendDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "verified@example.com",
        agencyName: "Agency",
        subAccountName: "Client A",
        accountPathSegment: "loc-1",
      }),
    );
  });

  it("skips when weekly digest preference is false", async () => {
    hoisted.findOrg.mockResolvedValue({
      id: orgId,
      name: "Agency",
      betterAuthOrganizationId: "ba-1",
      preferencesWeeklyDigestEnabled: false,
      preferencesEmailNotificationsEnabled: true,
    });

    const result = await runWeeklyDigestAfterAnalysis({
      organizationId: orgId,
      analysisId,
      subAccountId: subId,
      db: mockDb() as never,
      sendWeeklyDigestEmail: hoisted.sendDigest,
    });

    expect(result).toEqual({ sent: false, reason: "weekly_digest_disabled" });
    expect(hoisted.sendDigest).not.toHaveBeenCalled();
    expect(hoisted.resolveRecipient).not.toHaveBeenCalled();
  });

  it("skips when email notifications preference is false even if digest is on", async () => {
    hoisted.findOrg.mockResolvedValue({
      id: orgId,
      name: "Agency",
      betterAuthOrganizationId: "ba-1",
      preferencesWeeklyDigestEnabled: true,
      preferencesEmailNotificationsEnabled: false,
    });

    const result = await runWeeklyDigestAfterAnalysis({
      organizationId: orgId,
      analysisId,
      subAccountId: subId,
      db: mockDb() as never,
      sendWeeklyDigestEmail: hoisted.sendDigest,
    });

    expect(result).toEqual({
      sent: false,
      reason: "email_notifications_disabled",
    });
    expect(hoisted.sendDigest).not.toHaveBeenCalled();
  });

  it("skips when both notification toggles are off", async () => {
    hoisted.findOrg.mockResolvedValue({
      id: orgId,
      name: "Agency",
      betterAuthOrganizationId: "ba-1",
      preferencesWeeklyDigestEnabled: false,
      preferencesEmailNotificationsEnabled: false,
    });

    const result = await runWeeklyDigestAfterAnalysis({
      organizationId: orgId,
      analysisId,
      subAccountId: subId,
      db: mockDb() as never,
      sendWeeklyDigestEmail: hoisted.sendDigest,
    });

    expect(result).toEqual({ sent: false, reason: "weekly_digest_disabled" });
    expect(hoisted.sendDigest).not.toHaveBeenCalled();
  });

  it("skips when no verified recipient (resolver returns null)", async () => {
    hoisted.resolveRecipient.mockResolvedValue(null);

    const result = await runWeeklyDigestAfterAnalysis({
      organizationId: orgId,
      analysisId,
      subAccountId: subId,
      db: mockDb() as never,
      sendWeeklyDigestEmail: hoisted.sendDigest,
    });

    expect(result).toEqual({ sent: false, reason: "no_recipient" });
    expect(hoisted.sendDigest).not.toHaveBeenCalled();
  });
});
