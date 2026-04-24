import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import {
  AUTH_API_PREFIX,
  authRateLimitResponseIfBlockedWithConfig,
  classifyAuthRateLimitGroup,
  getAuthApiSubpath,
} from "@/lib/rate-limit-auth";
import { resetInMemoryRateLimitWindowsForTests } from "@/lib/rate-limit";

describe("getAuthApiSubpath", () => {
  it("returns / for the bare auth prefix", () => {
    expect(getAuthApiSubpath(AUTH_API_PREFIX)).toBe("/");
  });

  it("strips the /api/auth prefix", () => {
    expect(getAuthApiSubpath(`${AUTH_API_PREFIX}/sign-in/email`)).toBe(
      "/sign-in/email",
    );
  });
});

describe("classifyAuthRateLimitGroup", () => {
  it.each([
    ["/sign-in", "sign-in"],
    ["/sign-in/email", "sign-in"],
    ["/sign-in/social", "sign-in"],
    ["/sign-up", "sign-up"],
    ["/sign-up/email", "sign-up"],
    ["/request-password-reset", "password-reset"],
    ["/reset-password", "password-reset"],
    ["/reset-password/abc-token", "password-reset"],
    ["/send-verification-email", "send-verification"],
  ] as const)("classifies %s → %s", (subpath, expected) => {
    expect(classifyAuthRateLimitGroup(subpath)).toBe(expected);
  });

  it("returns null for routes outside abuse buckets", () => {
    expect(classifyAuthRateLimitGroup("/get-session")).toBeNull();
    expect(classifyAuthRateLimitGroup("/organization/list")).toBeNull();
    expect(classifyAuthRateLimitGroup("/verify-email")).toBeNull();
  });
});

describe("authRateLimitResponseIfBlockedWithConfig", () => {
  const tightLimits = {
    signInPerIpPerMinute: 2,
    signUpPerIpPerMinute: 100,
    passwordResetPerIpPerMinute: 100,
    sendVerificationEmailPerIpPerMinute: 100,
  };

  beforeEach(() => {
    resetInMemoryRateLimitWindowsForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetInMemoryRateLimitWindowsForTests();
  });

  function signInRequest(ip: string): NextRequest {
    return new NextRequest(`http://localhost${AUTH_API_PREFIX}/sign-in/email`, {
      method: "POST",
      headers: { "x-forwarded-for": ip },
    });
  }

  it("returns null until the per-IP sign-in budget is exhausted, then 429 with Retry-After", async () => {
    const ip = "203.0.113.10";
    expect(
      authRateLimitResponseIfBlockedWithConfig(signInRequest(ip), tightLimits),
    ).toBeNull();
    expect(
      authRateLimitResponseIfBlockedWithConfig(signInRequest(ip), tightLimits),
    ).toBeNull();

    const blocked = authRateLimitResponseIfBlockedWithConfig(
      signInRequest(ip),
      tightLimits,
    );
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toMatch(/^\d+$/);
    const json = (await blocked!.json()) as {
      error: string;
      retryAfter: number;
    };
    expect(json.error).toContain("Too many requests");
    expect(json.retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("does not share sign-in budget across different client IPs", () => {
    expect(
      authRateLimitResponseIfBlockedWithConfig(
        signInRequest("203.0.113.1"),
        tightLimits,
      ),
    ).toBeNull();
    expect(
      authRateLimitResponseIfBlockedWithConfig(
        signInRequest("203.0.113.1"),
        tightLimits,
      ),
    ).toBeNull();
    expect(
      authRateLimitResponseIfBlockedWithConfig(
        signInRequest("203.0.113.1"),
        tightLimits,
      )!.status,
    ).toBe(429);

    expect(
      authRateLimitResponseIfBlockedWithConfig(
        signInRequest("203.0.113.2"),
        tightLimits,
      ),
    ).toBeNull();
  });

  it("does not rate-limit unclassified paths regardless of call volume", () => {
    const req = new NextRequest(
      `http://localhost${AUTH_API_PREFIX}/get-session`,
      {
        method: "GET",
        headers: { "x-forwarded-for": "198.51.100.5" },
      },
    );
    for (let i = 0; i < 20; i++) {
      expect(
        authRateLimitResponseIfBlockedWithConfig(req, tightLimits),
      ).toBeNull();
    }
  });

  it("uses the leftmost x-forwarded-for entry as the client IP", () => {
    const limits = { ...tightLimits, signInPerIpPerMinute: 1 };
    const req = new NextRequest(
      `http://localhost${AUTH_API_PREFIX}/sign-in/email`,
      {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.20, 198.51.100.21" },
      },
    );
    expect(authRateLimitResponseIfBlockedWithConfig(req, limits)).toBeNull();
    expect(authRateLimitResponseIfBlockedWithConfig(req, limits)!.status).toBe(
      429,
    );

    resetInMemoryRateLimitWindowsForTests();

    const otherChain = new NextRequest(
      `http://localhost${AUTH_API_PREFIX}/sign-in/email`,
      {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.21, 198.51.100.20" },
      },
    );
    expect(
      authRateLimitResponseIfBlockedWithConfig(otherChain, limits),
    ).toBeNull();
  });

  it("falls back to x-vercel-forwarded-for when x-forwarded-for is absent", () => {
    const limits = { ...tightLimits, signInPerIpPerMinute: 1 };
    const req = new NextRequest(
      `http://localhost${AUTH_API_PREFIX}/sign-in/email`,
      {
        method: "POST",
        headers: { "x-vercel-forwarded-for": "198.51.100.40" },
      },
    );
    expect(authRateLimitResponseIfBlockedWithConfig(req, limits)).toBeNull();
    expect(authRateLimitResponseIfBlockedWithConfig(req, limits)!.status).toBe(
      429,
    );
  });

  it("treats max 0 as disabled for that bucket", () => {
    const disabled = {
      signInPerIpPerMinute: 0,
      signUpPerIpPerMinute: 0,
      passwordResetPerIpPerMinute: 0,
      sendVerificationEmailPerIpPerMinute: 0,
    };
    const req = signInRequest("203.0.113.99");
    for (let i = 0; i < 5; i++) {
      expect(
        authRateLimitResponseIfBlockedWithConfig(req, disabled),
      ).toBeNull();
    }
  });
});
