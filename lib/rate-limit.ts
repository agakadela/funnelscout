// In-memory per-process store — not globally consistent on multi-instance deployments (Vercel).
// For strict global rate limiting, replace with Upstash Redis.
//
// Callers must namespace keys (e.g. org UUID for analysis, `auth:${group}:${ip}` for Better Auth) so
// buckets never collide across features.

type RateLimitWindow = { count: number; resetAt: number };

const rateLimitWindows = new Map<string, RateLimitWindow>();

export function resetInMemoryRateLimitWindowsForTests(): void {
  rateLimitWindows.clear();
}

export function checkRateLimit(
  bucketKey: string,
  maxRequests = 10,
  windowMs = 60_000,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = rateLimitWindows.get(bucketKey);

  if (!existing || now > existing.resetAt) {
    rateLimitWindows.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count++;
  return { allowed: true, retryAfterMs: 0 };
}
