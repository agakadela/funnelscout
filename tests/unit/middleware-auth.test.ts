import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

describe("middleware auth backstop", () => {
  it("redirects to sign-in with callbackUrl when session cookie is absent", () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/dashboard/reports"),
    );
    const res = middleware(req);
    expect(res.status).toBe(302);
    const loc = res.headers.get("location");
    expect(loc).toBe(
      "http://localhost:3000/sign-in?callbackUrl=%2Fdashboard%2Freports",
    );
  });

  it("continues when better-auth session cookie is present", () => {
    const req = new NextRequest(new URL("http://localhost:3000/dashboard"), {
      headers: {
        cookie: "better-auth.session_token=test-token",
      },
    });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });
});
