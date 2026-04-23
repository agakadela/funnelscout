import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const hoisted = vi.hoisted(() => ({
  innerHandler: vi.fn(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ),
  rateLimit: vi.fn((req: NextRequest): NextResponse | null => {
    void req;
    return null;
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: {} }));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: hoisted.innerHandler,
    POST: hoisted.innerHandler,
    PUT: hoisted.innerHandler,
    PATCH: hoisted.innerHandler,
    DELETE: hoisted.innerHandler,
  }),
}));

vi.mock("@/lib/rate-limit-auth", () => ({
  authRateLimitResponseIfBlocked: (req: NextRequest) => hoisted.rateLimit(req),
}));

describe("app/api/auth/[...all] route wrapper", () => {
  beforeEach(() => {
    hoisted.innerHandler.mockClear();
    hoisted.rateLimit.mockReset();
    hoisted.rateLimit.mockImplementation(() => null);
  });

  it("returns 429 without calling Better Auth when rate limit returns a response", async () => {
    hoisted.rateLimit.mockReturnValueOnce(
      NextResponse.json({ error: "Too many", retryAfter: 9 }, { status: 429 }),
    );
    const { GET } = await import("@/app/api/auth/[...all]/route");
    const res = await GET(
      new NextRequest(`http://localhost/api/auth/get-session`, {
        method: "GET",
      }),
    );
    expect(res.status).toBe(429);
    expect(hoisted.innerHandler).not.toHaveBeenCalled();
  });

  it("delegates to Better Auth when rate limit allows the request", async () => {
    const { GET } = await import("@/app/api/auth/[...all]/route");
    const res = await GET(
      new NextRequest(`http://localhost/api/auth/get-session`, {
        method: "GET",
      }),
    );
    expect(res.status).toBe(200);
    expect(hoisted.innerHandler).toHaveBeenCalledTimes(1);
  });
});
