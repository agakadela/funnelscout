import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getCachedAuthSession: vi.fn(),
  findOrg: vi.fn(),
  findAnalysis: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getCachedAuthSession: hoisted.getCachedAuthSession,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: { findFirst: hoisted.findOrg },
      analyses: { findFirst: hoisted.findAnalysis },
    },
  },
}));

import { GET } from "@/app/api/analysis/status/route";

const ORG_ID_A = "00000000-0000-0000-0000-000000000001";

function statusRequest(id: string | null): Request {
  const q = id === null ? "" : `?id=${encodeURIComponent(id)}`;
  return new Request(`http://localhost/api/analysis/status${q}`, {
    method: "GET",
  });
}

describe("GET /api/analysis/status", () => {
  beforeEach(() => {
    hoisted.getCachedAuthSession.mockReset();
    hoisted.findOrg.mockReset();
    hoisted.findAnalysis.mockReset();

    hoisted.getCachedAuthSession.mockResolvedValue({
      session: { activeOrganizationId: "ba-org-1" },
    });
    hoisted.findOrg.mockResolvedValue({
      id: ORG_ID_A,
      betterAuthOrganizationId: "ba-org-1",
    });
  });

  it("returns 401 when there is no session", async () => {
    hoisted.getCachedAuthSession.mockResolvedValue(null);
    const res = await GET(statusRequest("a-1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await GET(statusRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is empty string", async () => {
    const res = await GET(statusRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 404 when analysis is not in organization", async () => {
    hoisted.findAnalysis.mockResolvedValue(undefined);
    const res = await GET(statusRequest("missing"));
    expect(res.status).toBe(404);
  });

  it("returns status pending without errorMessage", async () => {
    hoisted.findAnalysis.mockResolvedValue({
      status: "pending",
      errorMessage: null,
    });
    const res = await GET(statusRequest("analysis-1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      status: string;
      errorMessage?: string;
    };
    expect(json.status).toBe("pending");
    expect(json.errorMessage).toBeUndefined();
  });

  it("returns status running", async () => {
    hoisted.findAnalysis.mockResolvedValue({
      status: "running",
      errorMessage: null,
    });
    const res = await GET(statusRequest("analysis-1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("running");
  });

  it("returns status completed", async () => {
    hoisted.findAnalysis.mockResolvedValue({
      status: "completed",
      errorMessage: null,
    });
    const res = await GET(statusRequest("analysis-1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("completed");
  });

  it("returns status failed with errorMessage", async () => {
    hoisted.findAnalysis.mockResolvedValue({
      status: "failed",
      errorMessage: "Plan limit exceeded",
    });
    const res = await GET(statusRequest("analysis-1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      status: string;
      errorMessage?: string;
    };
    expect(json.status).toBe("failed");
    expect(json.errorMessage).toBe("Plan limit exceeded");
  });

  it("maps unknown db status to pending", async () => {
    hoisted.findAnalysis.mockResolvedValue({
      status: "weird",
      errorMessage: null,
    });
    const res = await GET(statusRequest("analysis-1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("pending");
  });
});
