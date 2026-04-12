import { beforeEach, describe, expect, it, vi } from "vitest";

import { subAccounts, subscriptions } from "@/drizzle/schema";

const hoisted = vi.hoisted(() => ({
  selectFrom: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: hoisted.selectFrom,
  },
}));

import { checkPlanLimit, evaluatePlanLimit } from "@/lib/billing";
import {
  planPriceDisplayUsd,
  PLAN_CHECKOUT_AMOUNT_USD_CENTS,
} from "@/lib/billing-plans";

function mockSubscriptionSelect(row: unknown[]) {
  return {
    from: vi.fn((table: unknown) => {
      if (table !== subscriptions) {
        throw new Error("expected subscriptions select");
      }
      return {
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(row)),
        })),
      };
    }),
  };
}

function mockSubAccountCountSelect(n: number) {
  return {
    from: vi.fn((table: unknown) => {
      if (table !== subAccounts) {
        throw new Error("expected sub_accounts select");
      }
      return {
        where: vi.fn(() => Promise.resolve([{ n }])),
      };
    }),
  };
}

describe("evaluatePlanLimit", () => {
  const activeSubscription = { status: "active", subAccountLimit: 5 };

  it("blocks analysis when active sub-account count equals the limit", () => {
    expect(
      evaluatePlanLimit({
        subscription: activeSubscription,
        activeSubAccountCount: 5,
      }),
    ).toEqual({ allowed: false, reason: "limit_reached" });
  });

  it("blocks analysis when active sub-account count exceeds the limit", () => {
    expect(
      evaluatePlanLimit({
        subscription: activeSubscription,
        activeSubAccountCount: 6,
      }),
    ).toEqual({ allowed: false, reason: "limit_reached" });
  });

  it("allows analysis when active sub-account count is below the limit", () => {
    expect(
      evaluatePlanLimit({
        subscription: activeSubscription,
        activeSubAccountCount: 4,
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks when subscription status is not active", () => {
    expect(
      evaluatePlanLimit({
        subscription: { status: "canceled", subAccountLimit: 5 },
        activeSubAccountCount: 0,
      }),
    ).toEqual({ allowed: false, reason: "subscription_inactive" });
  });

  it("blocks when there is no subscription", () => {
    expect(
      evaluatePlanLimit({
        subscription: null,
        activeSubAccountCount: 0,
      }),
    ).toEqual({ allowed: false, reason: "no_subscription" });
  });
});

describe("checkPlanLimit", () => {
  beforeEach(() => {
    hoisted.selectFrom.mockReset();
  });

  it("allows analysis when the org is below the active sub-account limit", async () => {
    hoisted.selectFrom
      .mockImplementationOnce(() =>
        mockSubscriptionSelect([{ status: "active", subAccountLimit: 5 }]),
      )
      .mockImplementationOnce(() => mockSubAccountCountSelect(2));

    await expect(checkPlanLimit("org-1")).resolves.toEqual({ allowed: true });
  });

  it("blocks analysis when active sub-account count reaches the plan limit", async () => {
    hoisted.selectFrom
      .mockImplementationOnce(() =>
        mockSubscriptionSelect([{ status: "active", subAccountLimit: 5 }]),
      )
      .mockImplementationOnce(() => mockSubAccountCountSelect(5));

    await expect(checkPlanLimit("org-1")).resolves.toEqual({
      allowed: false,
      reason: "limit_reached",
    });
  });

  it("blocks analysis when active sub-account count exceeds the plan limit", async () => {
    hoisted.selectFrom
      .mockImplementationOnce(() =>
        mockSubscriptionSelect([{ status: "active", subAccountLimit: 3 }]),
      )
      .mockImplementationOnce(() => mockSubAccountCountSelect(10));

    await expect(checkPlanLimit("org-1")).resolves.toEqual({
      allowed: false,
      reason: "limit_reached",
    });
  });

  it("blocks analysis when the subscription is not active", async () => {
    hoisted.selectFrom
      .mockImplementationOnce(() =>
        mockSubscriptionSelect([{ status: "canceled", subAccountLimit: 99 }]),
      )
      .mockImplementationOnce(() => mockSubAccountCountSelect(0));

    await expect(checkPlanLimit("org-1")).resolves.toEqual({
      allowed: false,
      reason: "subscription_inactive",
    });
  });

  it("blocks analysis when there is no subscription row", async () => {
    hoisted.selectFrom
      .mockImplementationOnce(() => mockSubscriptionSelect([]))
      .mockImplementationOnce(() => mockSubAccountCountSelect(0));

    await expect(checkPlanLimit("org-1")).resolves.toEqual({
      allowed: false,
      reason: "no_subscription",
    });
  });
});

describe("planPriceDisplayUsd", () => {
  it("formats whole-dollar monthly prices from PLAN_CHECKOUT_AMOUNT_USD_CENTS", () => {
    expect(planPriceDisplayUsd("starter")).toBe("$49");
    expect(planPriceDisplayUsd("agency")).toBe("$99");
    expect(planPriceDisplayUsd("pro")).toBe("$199");
    expect(PLAN_CHECKOUT_AMOUNT_USD_CENTS.starter).toBe(4900);
  });
});
