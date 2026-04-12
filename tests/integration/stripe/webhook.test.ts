import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

import { organizations, subscriptions } from "@/drizzle/schema";

const hoisted = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  insertValuesPayload: null as Record<string, unknown> | null,
  updateSetPayload: null as Record<string, unknown> | null,
  selectFrom: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: hoisted.constructEvent,
    },
    subscriptions: {
      retrieve: hoisted.retrieve,
      update: hoisted.update,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: hoisted.selectFrom,
    insert: vi.fn(() => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        hoisted.insertValuesPayload = payload;
        return {
          onConflictDoUpdate: vi.fn(() => Promise.resolve(undefined)),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        hoisted.updateSetPayload = payload;
        return {
          where: vi.fn(() => Promise.resolve(undefined)),
        };
      }),
    })),
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function makeStripeSubscription(
  overrides: Partial<Stripe.Subscription> & Pick<Stripe.Subscription, "id">,
): Stripe.Subscription {
  return {
    object: "subscription",
    status: "active",
    metadata: {},
    current_period_end: 1_717_200_000,
    items: { object: "list", data: [], has_more: false, url: "" },
    ...overrides,
  } as Stripe.Subscription;
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    hoisted.constructEvent.mockReset();
    hoisted.retrieve.mockReset();
    hoisted.update.mockReset();
    hoisted.selectFrom.mockReset();
    hoisted.insertValuesPayload = null;
    hoisted.updateSetPayload = null;
  });

  it("returns 401 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature verification fails and does not touch the database", async () => {
    hoisted.constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=abc" },
      body: '{"type":"checkout.session.completed"}',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(hoisted.selectFrom).not.toHaveBeenCalled();
  });

  it("checkout.session.completed upserts subscription with plan limit from metadata", async () => {
    const session = {
      id: "cs_test_1",
      object: "checkout.session",
      metadata: { organizationId: "org-1", plan: "agency" },
      customer: "cus_1",
      subscription: "sub_1",
    } as unknown as Stripe.Checkout.Session;

    const stripeSub = makeStripeSubscription({
      id: "sub_1",
      status: "active",
      metadata: { organizationId: "org-1", plan: "agency" },
    });

    hoisted.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: session },
    } as Stripe.Event);

    hoisted.retrieve.mockResolvedValue(stripeSub);

    hoisted.selectFrom.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table !== organizations) {
          throw new Error("expected organizations query");
        }
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: "org-1" }])),
          })),
        };
      }),
    }));

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "raw-body",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(hoisted.retrieve).toHaveBeenCalledWith("sub_1");
    expect(hoisted.insertValuesPayload).toMatchObject({
      organizationId: "org-1",
      plan: "agency",
      subAccountLimit: 15,
      status: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("customer.subscription.updated applies plan and status from Stripe", async () => {
    const subscription = makeStripeSubscription({
      id: "sub_2",
      status: "active",
      metadata: { organizationId: "org-2", plan: "pro" },
      current_period_end: 1_800_000_000,
    });

    hoisted.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: subscription },
    } as Stripe.Event);

    hoisted.selectFrom.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table !== subscriptions) {
          throw new Error("expected subscriptions query");
        }
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve([{ organizationId: "org-2", plan: "starter" }]),
            ),
          })),
        };
      }),
    }));

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "raw-body-2",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(hoisted.updateSetPayload).toMatchObject({
      plan: "pro",
      subAccountLimit: 999,
      status: "active",
    });
  });

  it("customer.subscription.deleted sets subscription status to canceled", async () => {
    const subscription = makeStripeSubscription({
      id: "sub_3",
      status: "canceled",
      metadata: { organizationId: "org-3" },
    });

    hoisted.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: subscription },
    } as Stripe.Event);

    hoisted.selectFrom.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table !== subscriptions) {
          throw new Error("expected subscriptions query");
        }
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ organizationId: "org-3" }])),
          })),
        };
      }),
    }));

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "raw-body-3",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(hoisted.updateSetPayload).toMatchObject({ status: "canceled" });
  });
});
