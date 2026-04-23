import { type NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { authRateLimitResponseIfBlocked } from "@/lib/rate-limit-auth";

// In-memory limits are per runtime instance only; on multi-instance Vercel deploys,
// effective limits are per instance until Upstash (or similar) backs `checkRateLimit`.

const {
  GET: baseGet,
  POST: basePost,
  PUT: basePut,
  PATCH: basePatch,
  DELETE: baseDelete,
} = toNextJsHandler(auth);

function withAuthRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest) => {
    const limited = authRateLimitResponseIfBlocked(req);
    if (limited != null) {
      return limited;
    }
    return handler(req);
  };
}

export const GET = withAuthRateLimit(baseGet);
export const POST = withAuthRateLimit(basePost);
export const PUT = withAuthRateLimit(basePut);
export const PATCH = withAuthRateLimit(basePatch);
export const DELETE = withAuthRateLimit(baseDelete);
