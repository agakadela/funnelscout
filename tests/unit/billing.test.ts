import { describe, expect, it } from "vitest";
import { evaluatePlanLimit } from "@/lib/billing";

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
