import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetInMemoryRateLimitWindowsForTests } from "@/lib/rate-limit";

const hoisted = vi.hoisted(() => ({
  getCachedAuthSession: vi.fn(),
  prepareAccountAnalysis: vi.fn(),
  inngestSend: vi.fn(),
  findOrg: vi.fn(),
  findSub: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getCachedAuthSession: hoisted.getCachedAuthSession,
}));

vi.mock("@/lib/analysis/enqueue", () => ({
  prepareAccountAnalysis: hoisted.prepareAccountAnalysis,
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: hoisted.inngestSend },
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: { findFirst: hoisted.findOrg },
      subAccounts: { findFirst: hoisted.findSub },
    },
  },
}));

import { POST } from "@/app/api/analysis/trigger/route";

const ORG_ID_A = "00000000-0000-0000-0000-000000000001";
const ORG_ID_B = "00000000-0000-0000-0000-000000000002";

function triggerBody(): Request {
  return new Request("http://localhost/api/analysis/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subAccountId: "sub-1" }),
  });
}

function preparedSend(organizationId: string) {
  return {
    outcome: "send" as const,
    analysisId: "analysis-1",
    idempotencyId: "idem-1",
    eventPayload: {
      analysisId: "analysis-1",
      organizationId,
      subAccountId: "sub-1",
      triggeredBy: "manual" as const,
      periodStart: "2026-04-06T00:00:00.000Z",
      periodEnd: "2026-04-13T00:00:00.000Z",
    },
  };
}

describe("POST /api/analysis/trigger", () => {
  beforeEach(() => {
    resetInMemoryRateLimitWindowsForTests();
    hoisted.getCachedAuthSession.mockReset();
    hoisted.prepareAccountAnalysis.mockReset();
    hoisted.inngestSend.mockReset();
    hoisted.findOrg.mockReset();
    hoisted.findSub.mockReset();

    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org-1" },
    });
    hoisted.findOrg.mockResolvedValue({
      id: ORG_ID_A,
      betterAuthOrganizationId: "ba-org-1",
    });
    hoisted.findSub.mockResolvedValue({ id: "sub-1" });
    hoisted.prepareAccountAnalysis.mockResolvedValue(preparedSend(ORG_ID_A));
    hoisted.inngestSend.mockResolvedValue({ ids: ["evt"] });
  });

  it("returns 401 when there is no session", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue(null);
    const res = await POST(triggerBody());
    expect(res.status).toBe(401);
  });

  it("returns 429 with Retry-After after exceeding per-organization rate limit", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(triggerBody());
      expect(res.status).toBe(200);
    }

    const res429 = await POST(triggerBody());
    expect(res429.status).toBe(429);
    const retryAfter = res429.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    const retryAfterNum = Number(retryAfter);
    expect(retryAfterNum).toBeGreaterThanOrEqual(1);
    const json = (await res429.json()) as {
      error: string;
      retryAfter: number;
    };
    expect(json.retryAfter).toBe(retryAfterNum);
    expect(json.error).toContain("Too many analysis");
    expect(hoisted.prepareAccountAnalysis).toHaveBeenCalledTimes(10);
    expect(hoisted.inngestSend).toHaveBeenCalledTimes(10);
  });

  it("does not share rate limit across different organizations", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(triggerBody())).status).toBe(200);
    }
    expect((await POST(triggerBody())).status).toBe(429);

    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org-2" },
    });
    hoisted.findOrg.mockResolvedValue({
      id: ORG_ID_B,
      betterAuthOrganizationId: "ba-org-2",
    });
    hoisted.prepareAccountAnalysis.mockResolvedValue(preparedSend(ORG_ID_B));

    const resB = await POST(triggerBody());
    expect(resB.status).toBe(200);
  });
});
