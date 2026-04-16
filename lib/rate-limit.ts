// In-memory per-process store — not globally consistent on multi-instance deployments (Vercel).
// For strict global rate limiting, replace with Upstash Redis.

type RateLimitWindow = { count: number; resetAt: number };

const orgWindows = new Map<string, RateLimitWindow>();

export function resetInMemoryRateLimitWindowsForTests(): void {
  orgWindows.clear();
}

export function checkRateLimit(
  orgId: string,
  maxRequests = 10,
  windowMs = 60_000,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = orgWindows.get(orgId);

  if (!existing || now > existing.resetAt) {
    orgWindows.set(orgId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count++;
  return { allowed: true, retryAfterMs: 0 };
}
