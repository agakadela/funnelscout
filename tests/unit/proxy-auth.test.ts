import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

function assertCspNoncePresent(res: Response): void {
  const csp = res.headers.get("Content-Security-Policy");
  expect(csp).toBeTruthy();
  expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/);
  expect(csp).toContain("'strict-dynamic'");
}

describe("proxy auth backstop", () => {
  it("redirects to sign-in with callbackUrl when session cookie is absent", () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/dashboard/reports"),
    );
    const res = proxy(req);
    expect(res.status).toBe(302);
    const loc = res.headers.get("location");
    expect(loc).toBe(
      "http://localhost:3000/sign-in?callbackUrl=%2Fdashboard%2Freports",
    );
    assertCspNoncePresent(res);
  });

  it("continues when better-auth session cookie is present", () => {
    const req = new NextRequest(new URL("http://localhost:3000/dashboard"), {
      headers: {
        cookie: "better-auth.session_token=test-token",
      },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
    assertCspNoncePresent(res);
  });
});
