import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

/** Public API prefix for Better Auth on this app (matches `app/api/auth/[...all]`). */
export const AUTH_API_PREFIX = "/api/auth";

const WINDOW_MS = 60_000;

export type AuthRateLimitGroup =
  | "sign-in"
  | "sign-up"
  | "password-reset"
  | "send-verification";

/** Limits for sensitive Better Auth operations (per client IP, sliding window). */
export type AuthRateLimitConfig = {
  signInPerIpPerMinute: number;
  signUpPerIpPerMinute: number;
  passwordResetPerIpPerMinute: number;
  sendVerificationEmailPerIpPerMinute: number;
};

export function getAuthApiSubpath(pathname: string): string {
  if (pathname === AUTH_API_PREFIX) {
    return "/";
  }
  if (pathname.startsWith(`${AUTH_API_PREFIX}/`)) {
    return pathname.slice(AUTH_API_PREFIX.length);
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

/**
 * Maps Better Auth route subpaths (under `/api/auth`) to a rate-limit bucket.
 * Returns `null` when no extra abuse throttle applies (session, org plugin, etc.).
 */
export function classifyAuthRateLimitGroup(
  subpath: string,
): AuthRateLimitGroup | null {
  const p = subpath.startsWith("/") ? subpath : `/${subpath}`;

  if (p === "/sign-in" || p.startsWith("/sign-in/")) {
    return "sign-in";
  }
  if (p === "/sign-up" || p.startsWith("/sign-up/")) {
    return "sign-up";
  }
  if (p === "/request-password-reset" || p.startsWith("/reset-password")) {
    return "password-reset";
  }
  if (p.startsWith("/send-verification-email")) {
    return "send-verification";
  }
  return null;
}

function maxForGroup(
  group: AuthRateLimitGroup,
  config: AuthRateLimitConfig,
): number {
  switch (group) {
    case "sign-in":
      return config.signInPerIpPerMinute;
    case "sign-up":
      return config.signUpPerIpPerMinute;
    case "password-reset":
      return config.passwordResetPerIpPerMinute;
    case "send-verification":
      return config.sendVerificationEmailPerIpPerMinute;
  }
}

function rateLimitKey(ip: string, group: AuthRateLimitGroup): string {
  return `auth:${group}:${ip}`;
}

/**
 * @returns `NextResponse` with **429** + `Retry-After`, or `null` when the request may proceed.
 * Intentionally does **not** emit Sentry events or log raw IP/email (abuse control only).
 */
export function authRateLimitResponseIfBlockedWithConfig(
  request: NextRequest,
  config: AuthRateLimitConfig,
): NextResponse | null {
  const group = classifyAuthRateLimitGroup(
    getAuthApiSubpath(request.nextUrl.pathname),
  );
  if (group == null) {
    return null;
  }

  const max = maxForGroup(group, config);
  if (max <= 0) {
    return null;
  }

  const ip = getRequestClientIp(request);
  const key = rateLimitKey(ip, group);
  const result = checkRateLimit(key, max, WINDOW_MS);

  if (result.allowed) {
    return null;
  }

  const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return NextResponse.json(
    {
      error: "Too many requests. Please wait and try again.",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export function authRateLimitResponseIfBlocked(
  request: NextRequest,
): NextResponse | null {
  return authRateLimitResponseIfBlockedWithConfig(request, env.auth.rateLimit);
}
