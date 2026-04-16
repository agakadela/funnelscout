import { and, count, desc, eq } from "drizzle-orm";

import { analyses, organizations, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";

export const ANALYSIS_HISTORY_PAGE_SIZE = 25;

const ERROR_SNIPPET_MAX = 120;

function truncateErrorMessage(message: string, maxLen: number): string {
  const t = message.trim();
  if (t.length <= maxLen) {
    return t;
  }
  return `${t.slice(0, maxLen - 1)}…`;
}

export type AnalysisHistoryRow = {
  id: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  periodStart: Date;
  periodEnd: Date;
  subAccountName: string;
  ghlLocationId: string;
  errorSnippet: string | null;
};

export type AnalysisHistoryData =
  | { kind: "not_found" }
  | {
      kind: "ok";
      organizationId: string;
      rows: AnalysisHistoryRow[];
      page: number;
      pageSize: number;
      totalCount: number;
    };

function clampRequestedPage(page: number): number {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

export async function loadAnalysisHistoryData(input: {
  betterAuthOrganizationId: string;
  page: number;
}): Promise<AnalysisHistoryData> {
  const orgRow = await db.query.organizations.findFirst({
    where: eq(
      organizations.betterAuthOrganizationId,
      input.betterAuthOrganizationId,
    ),
  });

  if (!orgRow) {
    return { kind: "not_found" };
  }

  const pageSize = ANALYSIS_HISTORY_PAGE_SIZE;
  const requestedPage = clampRequestedPage(input.page);

  const [countRow] = await db
    .select({ n: count() })
    .from(analyses)
    .where(eq(analyses.organizationId, orgRow.id));

  const totalCount = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rawRows = await db
    .select({
      id: analyses.id,
      status: analyses.status,
      createdAt: analyses.createdAt,
      completedAt: analyses.completedAt,
      periodStart: analyses.periodStart,
      periodEnd: analyses.periodEnd,
      errorMessage: analyses.errorMessage,
      subAccountName: subAccounts.name,
      ghlLocationId: subAccounts.ghlLocationId,
    })
    .from(analyses)
    .innerJoin(subAccounts, eq(analyses.subAccountId, subAccounts.id))
    .where(
      and(
        eq(analyses.organizationId, orgRow.id),
        eq(subAccounts.organizationId, orgRow.id),
      ),
    )
    .orderBy(desc(analyses.createdAt))
    .limit(pageSize)
    .offset(offset);

  const rows: AnalysisHistoryRow[] = rawRows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    subAccountName: row.subAccountName,
    ghlLocationId: row.ghlLocationId,
    errorSnippet:
      row.status === "failed" &&
      row.errorMessage !== null &&
      row.errorMessage.trim() !== ""
        ? truncateErrorMessage(row.errorMessage, ERROR_SNIPPET_MAX)
        : null,
  }));

  return {
    kind: "ok",
    organizationId: orgRow.id,
    rows,
    page,
    pageSize,
    totalCount,
  };
}
