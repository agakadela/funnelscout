import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { analyses, subAccounts } from "@/drizzle/schema";

const hoisted = vi.hoisted(() => ({
  findFirst: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: {
        findFirst: hoisted.findFirst,
      },
    },
    select: hoisted.select,
  },
}));

import {
  ANALYSIS_HISTORY_PAGE_SIZE,
  loadAnalysisHistoryData,
} from "@/lib/dashboard/load-analysis-history";

function mockCountChain(total: number) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ n: total }]),
    }),
  };
}

function mockRowsChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(rows),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("loadAnalysisHistoryData", () => {
  beforeEach(() => {
    hoisted.findFirst.mockReset();
    hoisted.select.mockReset();
  });

  it("returns not_found when organization row is missing", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);

    const res = await loadAnalysisHistoryData({
      betterAuthOrganizationId: "ba-missing",
      page: 1,
    });

    expect(res).toEqual({ kind: "not_found" });
    expect(hoisted.select).not.toHaveBeenCalled();
  });

  it("scopes count and list queries by organization id", async () => {
    const orgId = "org-tenant-99";
    hoisted.findFirst.mockResolvedValue({ id: orgId });
    const countWhere = vi.fn().mockResolvedValue([{ n: 0 }]);
    const rowsWhere = vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    hoisted.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({ where: countWhere }),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({ where: rowsWhere }),
        }),
      }));

    await loadAnalysisHistoryData({
      betterAuthOrganizationId: "ba-xyz",
      page: 1,
    });

    expect(countWhere).toHaveBeenCalledWith(eq(analyses.organizationId, orgId));
    expect(rowsWhere).toHaveBeenCalledWith(
      and(
        eq(analyses.organizationId, orgId),
        eq(subAccounts.organizationId, orgId),
      ),
    );
  });

  it("returns mapped rows ordered by query contract and totalCount", async () => {
    hoisted.findFirst.mockResolvedValue({ id: "org-app-1" });
    hoisted.select
      .mockImplementationOnce(() => mockCountChain(2))
      .mockImplementationOnce(() =>
        mockRowsChain([
          {
            id: "a1",
            status: "completed",
            createdAt: new Date("2024-06-01T12:00:00.000Z"),
            completedAt: new Date("2024-06-01T12:30:00.000Z"),
            periodStart: new Date("2024-05-01"),
            periodEnd: new Date("2024-05-07"),
            errorMessage: null,
            subAccountName: "Acme",
            ghlLocationId: "loc-99",
          },
        ]),
      );

    const res = await loadAnalysisHistoryData({
      betterAuthOrganizationId: "ba-1",
      page: 1,
    });

    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") {
      return;
    }
    expect(res.organizationId).toBe("org-app-1");
    expect(res.totalCount).toBe(2);
    expect(res.pageSize).toBe(ANALYSIS_HISTORY_PAGE_SIZE);
    expect(res.page).toBe(1);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({
      id: "a1",
      status: "completed",
      subAccountName: "Acme",
      ghlLocationId: "loc-99",
      errorSnippet: null,
    });
  });

  it("truncates error snippet for failed analyses", async () => {
    hoisted.findFirst.mockResolvedValue({ id: "org-1" });
    const longErr = `x${"e".repeat(200)}`;
    hoisted.select
      .mockImplementationOnce(() => mockCountChain(1))
      .mockImplementationOnce(() =>
        mockRowsChain([
          {
            id: "a-fail",
            status: "failed",
            createdAt: new Date("2024-01-01"),
            completedAt: null,
            periodStart: new Date("2023-12-01"),
            periodEnd: new Date("2023-12-07"),
            errorMessage: longErr,
            subAccountName: "B",
            ghlLocationId: "loc-b",
          },
        ]),
      );

    const res = await loadAnalysisHistoryData({
      betterAuthOrganizationId: "ba-1",
      page: 1,
    });

    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") {
      return;
    }
    const snippet = res.rows[0]?.errorSnippet;
    expect(snippet).toBeDefined();
    expect(snippet!.length).toBeLessThanOrEqual(120);
    expect(snippet!.endsWith("…")).toBe(true);
  });

  it("does not attach error snippet for non-failed status", async () => {
    hoisted.findFirst.mockResolvedValue({ id: "org-1" });
    hoisted.select
      .mockImplementationOnce(() => mockCountChain(1))
      .mockImplementationOnce(() =>
        mockRowsChain([
          {
            id: "a2",
            status: "completed",
            createdAt: new Date("2024-01-01"),
            completedAt: null,
            periodStart: new Date("2023-12-01"),
            periodEnd: new Date("2023-12-07"),
            errorMessage: "should be ignored",
            subAccountName: "C",
            ghlLocationId: "loc-c",
          },
        ]),
      );

    const res = await loadAnalysisHistoryData({
      betterAuthOrganizationId: "ba-1",
      page: 1,
    });

    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") {
      return;
    }
    expect(res.rows[0]?.errorSnippet).toBeNull();
  });

  it("clamps page when requested page exceeds total pages", async () => {
    hoisted.findFirst.mockResolvedValue({ id: "org-1" });
    hoisted.select
      .mockImplementationOnce(() => mockCountChain(3))
      .mockImplementationOnce(() =>
        mockRowsChain([
          {
            id: "late",
            status: "pending",
            createdAt: new Date("2024-01-03"),
            completedAt: null,
            periodStart: new Date("2023-12-01"),
            periodEnd: new Date("2023-12-07"),
            errorMessage: null,
            subAccountName: "D",
            ghlLocationId: "loc-d",
          },
        ]),
      );

    const res = await loadAnalysisHistoryData({
      betterAuthOrganizationId: "ba-1",
      page: 99,
    });

    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") {
      return;
    }
    expect(res.page).toBe(1);
  });
});
