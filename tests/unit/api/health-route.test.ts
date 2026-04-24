import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 and stable JSON for liveness probes", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const json = (await res.json()) as { status: string };
    expect(json).toEqual({ status: "ok" });
  });
});
