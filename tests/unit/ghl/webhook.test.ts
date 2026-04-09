import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  encryptGhlToken,
  decryptGhlToken,
  verifyGhlWebhookHmacSignature,
} from "@/lib/ghl/oauth";
import { GHLWebhookEventSchema } from "@/lib/ghl/types";

const WEBHOOK_SECRET = "test_ghl_webhook_secret";

function signBody(body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("hex");
}

describe("ghl/webhook", () => {
  it("HMAC verification passes for valid signature", () => {
    const body = JSON.stringify({ ping: true });
    const sig = signBody(body);
    expect(verifyGhlWebhookHmacSignature(body, sig, WEBHOOK_SECRET)).toBe(true);
  });

  it("HMAC verification fails for tampered body", () => {
    const body = JSON.stringify({ ping: true });
    const sig = signBody(body);
    expect(verifyGhlWebhookHmacSignature(body + " ", sig, WEBHOOK_SECRET)).toBe(
      false,
    );
  });

  it("HMAC verification fails for missing/invalid header", () => {
    const body = "{}";
    expect(verifyGhlWebhookHmacSignature(body, "", WEBHOOK_SECRET)).toBe(false);
    expect(verifyGhlWebhookHmacSignature(body, "not-hex", WEBHOOK_SECRET)).toBe(
      false,
    );
  });

  it("accepts sha256= prefix on signature header", () => {
    const body = "{}";
    const sig = signBody(body);
    expect(
      verifyGhlWebhookHmacSignature(body, `sha256=${sig}`, WEBHOOK_SECRET),
    ).toBe(true);
  });

  it("encrypt → decrypt round-trip", () => {
    const plain = "ghl-access-token-value";
    const enc = encryptGhlToken(plain);
    expect(decryptGhlToken(enc)).toBe(plain);
  });

  it("safeParse accepts all 4 event types", () => {
    const base = { locationId: "loc_1" };
    const samples = [
      {
        ...base,
        type: "OpportunityCreate" as const,
        data: {
          id: "o1",
          contactId: "c1",
          pipelineId: "p1",
          pipelineStageId: "s1",
          monetaryValue: 10,
          status: "open" as const,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      },
      {
        ...base,
        type: "OpportunityStageUpdate" as const,
        data: {
          id: "o1",
          contactId: "c1",
          pipelineId: "p1",
          pipelineStageId: "s2",
          monetaryValue: 10,
          status: "open" as const,
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      },
      {
        ...base,
        type: "OpportunityStatusUpdate" as const,
        data: {
          id: "o1",
          contactId: "c1",
          status: "won" as const,
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
      },
      {
        ...base,
        type: "OrderCreate" as const,
        data: {
          id: "ord1",
          contactId: "c1",
          totalPrice: 99,
          currency: "USD",
          createdAt: "2024-01-04T00:00:00.000Z",
        },
      },
    ];
    for (const s of samples) {
      const r = GHLWebhookEventSchema.safeParse(s);
      expect(r.success, JSON.stringify(r)).toBe(true);
    }
  });

  it("safeParse rejects unknown event type", () => {
    const r = GHLWebhookEventSchema.safeParse({
      type: "UnknownEvent",
      locationId: "x",
      data: {},
    });
    expect(r.success).toBe(false);
  });

  it("safeParse rejects missing required fields", () => {
    const r = GHLWebhookEventSchema.safeParse({
      type: "OpportunityCreate",
      locationId: "x",
      data: { id: "o1" },
    });
    expect(r.success).toBe(false);
  });
});
