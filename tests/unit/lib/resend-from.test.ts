import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  lastFrom: null as string | null,
  sendFn: vi.fn((opts: { from: string; to: string; subject?: string }) => {
    hoisted.lastFrom = opts.from;
    return Promise.resolve({ error: null });
  }),
  env: {
    nodeEnv: "production" as "development" | "production" | "test",
    resend: {
      apiKey: "re_test_key",
      from: "FunnelScout <hello@funnelscout.ai>" as string | undefined,
    },
    auth: {
      url: "https://app.example.com",
    },
  },
}));

vi.mock("@/lib/env", () => ({
  get env() {
    return hoisted.env;
  },
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>stub</html>"),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: hoisted.sendFn,
    };
  },
}));

import {
  sendGhlTokenRefreshFailedEmail,
  sendVerificationEmail,
} from "@/lib/resend";

describe("lib/resend transactional from", () => {
  beforeEach(() => {
    hoisted.sendFn.mockClear();
    hoisted.lastFrom = null;
    hoisted.env.nodeEnv = "production";
    hoisted.env.resend.from = "FunnelScout <hello@funnelscout.ai>";
  });

  it("uses RESEND_FROM from env on the production path", async () => {
    hoisted.env.resend.from = "FunnelScout <hello@funnelscout.ai>";
    await sendVerificationEmail({
      to: "u@example.com",
      verifyUrl: "https://app.example.com/verify",
    });
    expect(hoisted.lastFrom).toBe("FunnelScout <hello@funnelscout.ai>");
  });

  it("uses the Resend sandbox sender only when development and from is unset", async () => {
    hoisted.env.nodeEnv = "development";
    hoisted.env.resend.from = undefined;
    await sendVerificationEmail({
      to: "u@example.com",
      verifyUrl: "http://localhost:3000/verify",
    });
    expect(hoisted.lastFrom).toBe("FunnelScout <onboarding@resend.dev>");
  });

  it("throws before send when not development and from is unset", async () => {
    hoisted.env.nodeEnv = "production";
    hoisted.env.resend.from = undefined;
    await expect(
      sendGhlTokenRefreshFailedEmail({
        to: "owner@example.com",
        organizationName: "Agency",
      }),
    ).rejects.toThrow(/RESEND_FROM/);
    expect(hoisted.sendFn).not.toHaveBeenCalled();
  });
});
