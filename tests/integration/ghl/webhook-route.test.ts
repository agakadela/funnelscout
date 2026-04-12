import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: hoisted.send,
  },
}));

import { POST } from "@/app/api/webhooks/ghl/route";

const WEBHOOK_SECRET = "test_ghl_webhook_secret";

function signBody(body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("hex");
}

function validOpportunityCreateBody(): string {
  return JSON.stringify({
    type: "OpportunityCreate",
    locationId: "loc_test_1",
    data: {
      id: "opp_test_1",
      contactId: "con_test_1",
      pipelineId: "pipe_test_1",
      pipelineStageId: "stage_test_1",
      monetaryValue: 100,
      status: "open",
      createdAt: "2024-06-01T12:00:00.000Z",
    },
  });
}

describe("POST /api/webhooks/ghl", () => {
  beforeEach(() => {
    hoisted.send.mockReset();
  });

  it("returns 401 when HMAC is invalid", async () => {
    const body = validOpportunityCreateBody();
    const req = new NextRequest("http://localhost/api/webhooks/ghl", {
      method: "POST",
      headers: { "x-ghl-signature": "deadbeef" },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(hoisted.send).not.toHaveBeenCalled();
  });

  it("returns 400 when JSON is not an object", async () => {
    const body = "[]";
    const req = new NextRequest("http://localhost/api/webhooks/ghl", {
      method: "POST",
      headers: { "x-ghl-signature": signBody(body) },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(hoisted.send).not.toHaveBeenCalled();
  });

  it("returns 200 and enqueues Inngest when payload and signature are valid", async () => {
    const body = validOpportunityCreateBody();
    const req = new NextRequest("http://localhost/api/webhooks/ghl", {
      method: "POST",
      headers: { "x-ghl-signature": signBody(body) },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(hoisted.send).toHaveBeenCalledTimes(1);
    expect(hoisted.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ghl/webhook.received",
      }),
    );
  });
});
