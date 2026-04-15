import { describe, expect, it } from "vitest";

import {
  getGhlWebhookRateLimitBucketKeyCountForTests,
  resetGhlWebhookRateLimitBucketsForTests,
  tryConsumeGhlWebhookRateSlot,
} from "@/lib/ghl/webhook-rate-limit";

describe("tryConsumeGhlWebhookRateSlot", () => {
  it("allows all requests when limit is zero", () => {
    resetGhlWebhookRateLimitBucketsForTests();
    expect(tryConsumeGhlWebhookRateSlot("a", 0, 0)).toBe(true);
    expect(tryConsumeGhlWebhookRateSlot("a", 0, 1_000)).toBe(true);
  });

  it("allows up to max requests within the window", () => {
    resetGhlWebhookRateLimitBucketsForTests();
    const t0 = 1_000_000;
    expect(tryConsumeGhlWebhookRateSlot("ip1", 2, t0)).toBe(true);
    expect(tryConsumeGhlWebhookRateSlot("ip1", 2, t0 + 1000)).toBe(true);
    expect(tryConsumeGhlWebhookRateSlot("ip1", 2, t0 + 2000)).toBe(false);
  });

  it("resets the window after sixty seconds", () => {
    resetGhlWebhookRateLimitBucketsForTests();
    const t0 = 5_000_000;
    expect(tryConsumeGhlWebhookRateSlot("ip2", 1, t0)).toBe(true);
    expect(tryConsumeGhlWebhookRateSlot("ip2", 1, t0 + 30_000)).toBe(false);
    expect(tryConsumeGhlWebhookRateSlot("ip2", 1, t0 + 60_001)).toBe(true);
  });

  it("tracks keys independently", () => {
    resetGhlWebhookRateLimitBucketsForTests();
    const t = 8_000_000;
    expect(tryConsumeGhlWebhookRateSlot("a", 1, t)).toBe(true);
    expect(tryConsumeGhlWebhookRateSlot("b", 1, t)).toBe(true);
  });

  it("drops stale client keys after the sliding window elapses", () => {
    resetGhlWebhookRateLimitBucketsForTests();
    const t0 = 20_000_000;
    expect(tryConsumeGhlWebhookRateSlot("ip-a", 1, t0)).toBe(true);
    expect(tryConsumeGhlWebhookRateSlot("ip-b", 1, t0)).toBe(true);
    expect(getGhlWebhookRateLimitBucketKeyCountForTests()).toBe(2);

    tryConsumeGhlWebhookRateSlot("ip-c", 1, t0 + 60_001);
    expect(getGhlWebhookRateLimitBucketKeyCountForTests()).toBe(1);
  });

  it("prunes many one-shot client keys on the next check after the window", () => {
    resetGhlWebhookRateLimitBucketsForTests();
    const t0 = 30_000_000;
    for (let i = 0; i < 40; i++) {
      expect(tryConsumeGhlWebhookRateSlot(`burst-${i}`, 1, t0)).toBe(true);
    }
    expect(getGhlWebhookRateLimitBucketKeyCountForTests()).toBe(40);

    tryConsumeGhlWebhookRateSlot("next-window", 1, t0 + 60_001);
    expect(getGhlWebhookRateLimitBucketKeyCountForTests()).toBe(1);
  });
});
