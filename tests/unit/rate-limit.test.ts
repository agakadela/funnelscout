import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  resetInMemoryRateLimitWindowsForTests,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetInMemoryRateLimitWindowsForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetInMemoryRateLimitWindowsForTests();
  });

  it("allows the first request in a window", () => {
    const r = checkRateLimit("org-a", 10, 60_000);
    expect(r).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it("allows up to maxRequests then blocks until window resets", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("org-a", 10, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit("org-a", 10, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);

    vi.advanceTimersByTime(blocked.retryAfterMs + 1);
    const afterReset = checkRateLimit("org-a", 10, 60_000);
    expect(afterReset.allowed).toBe(true);
  });

  it("tracks organizations independently", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("org-1", 10, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit("org-1", 10, 60_000).allowed).toBe(false);
    expect(checkRateLimit("org-2", 10, 60_000).allowed).toBe(true);
  });
});
