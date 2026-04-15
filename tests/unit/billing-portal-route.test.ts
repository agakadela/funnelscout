import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getCachedAuthSession: vi.fn(),
  ensureAppOrganizationForBetterAuthOrg: vi.fn(),
  getSubscriptionForOrg: vi.fn(),
  portalCreate: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: hoisted.captureException,
}));

vi.mock("@/lib/auth-session", () => ({
  getCachedAuthSession: hoisted.getCachedAuthSession,
}));

vi.mock("@/lib/workspace-org", () => ({
  ensureAppOrganizationForBetterAuthOrg:
    hoisted.ensureAppOrganizationForBetterAuthOrg,
}));

vi.mock("@/lib/db/subscriptions", () => ({
  getSubscriptionForOrg: hoisted.getSubscriptionForOrg,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: hoisted.portalCreate,
      },
    },
  },
}));

import { POST } from "@/app/api/billing/portal/route";

describe("POST /api/billing/portal", () => {
  beforeEach(() => {
    hoisted.getCachedAuthSession.mockReset();
    hoisted.ensureAppOrganizationForBetterAuthOrg.mockReset();
    hoisted.getSubscriptionForOrg.mockReset();
    hoisted.portalCreate.mockReset();
    hoisted.captureException.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when active organization is missing", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: null },
    });
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 503 when workspace cannot be ensured", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org" },
    });
    hoisted.ensureAppOrganizationForBetterAuthOrg.mockResolvedValue({
      ok: false,
      error: "workspace_unavailable",
    });
    const res = await POST();
    expect(res.status).toBe(503);
  });

  it("returns 404 when subscription is missing", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org" },
    });
    hoisted.ensureAppOrganizationForBetterAuthOrg.mockResolvedValue({
      ok: true,
      id: "org-1",
    });
    hoisted.getSubscriptionForOrg.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("returns 404 when subscription exists but Stripe customer id is missing", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org" },
    });
    hoisted.ensureAppOrganizationForBetterAuthOrg.mockResolvedValue({
      ok: true,
      id: "org-1",
    });
    hoisted.getSubscriptionForOrg.mockResolvedValue({
      plan: "agency",
      status: "active",
      subAccountLimit: 15,
      stripeCustomerId: null,
      currentPeriodEnd: null,
    });
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("redirects to the Stripe portal URL on success", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org" },
    });
    hoisted.ensureAppOrganizationForBetterAuthOrg.mockResolvedValue({
      ok: true,
      id: "org-1",
    });
    hoisted.getSubscriptionForOrg.mockResolvedValue({
      plan: "agency",
      status: "active",
      subAccountLimit: 15,
      stripeCustomerId: "cus_test",
      currentPeriodEnd: null,
    });
    hoisted.portalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/test",
    });
    const res = await POST();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://billing.stripe.com/session/test",
    );
    expect(hoisted.portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test",
        return_url: "http://localhost:3000/billing",
      }),
    );
  });

  it("returns 500 and reports to Sentry when Stripe throws", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org" },
    });
    hoisted.ensureAppOrganizationForBetterAuthOrg.mockResolvedValue({
      ok: true,
      id: "org-1",
    });
    hoisted.getSubscriptionForOrg.mockResolvedValue({
      plan: "agency",
      status: "active",
      subAccountLimit: 15,
      stripeCustomerId: "cus_test",
      currentPeriodEnd: null,
    });
    const err = new Error("stripe down");
    hoisted.portalCreate.mockRejectedValue(err);
    const res = await POST();
    expect(res.status).toBe(500);
    expect(hoisted.captureException).toHaveBeenCalledWith(err);
  });
});
