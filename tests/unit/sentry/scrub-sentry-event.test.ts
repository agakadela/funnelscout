import { describe, expect, it } from "vitest";

import { scrubSentryEvent } from "@/lib/sentry/scrub-sentry-event";

describe("lib/sentry/scrub-sentry-event", () => {
  it("removes request cookies, headers, and body data", () => {
    const raw = {
      request: {
        cookies: { a: "b" },
        headers: { "x-test": "1" },
        data: { password: "x" },
      },
    };
    const event = scrubSentryEvent(raw);
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.headers).toBeUndefined();
    expect(
      "data" in event.request ? event.request.data : undefined,
    ).toBeUndefined();
  });

  it("strips common user PII fields while keeping ids if present", () => {
    const raw = {
      user: {
        id: "user_seed_1",
        email: "person@example.com",
        username: "person",
        ip_address: "192.0.2.1",
      },
    };
    const event = scrubSentryEvent(raw);
    expect(event.user.email).toBeUndefined();
    expect(event.user.username).toBeUndefined();
    expect(event.user.ip_address).toBeUndefined();
    expect(event.user.id).toBe("user_seed_1");
  });
});
