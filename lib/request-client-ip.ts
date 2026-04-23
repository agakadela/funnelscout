import type { NextRequest } from "next/server";

/**
 * Resolves the client IP for rate limiting and abuse controls.
 *
 * **Trust order (single convention for this app):** use the leftmost client
 * IP from `x-forwarded-for` when present; otherwise the leftmost IP from
 * `x-vercel-forwarded-for`; otherwise `"unknown"`. Use this helper for every
 * server-side per-IP limit (Better Auth, GHL webhook, etc.) so headers are not
 * interpreted differently across routes.
 */
export function getRequestClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
