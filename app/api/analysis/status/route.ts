import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { analyses, organizations } from "@/drizzle/schema";
import { getCachedAuthSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

const QuerySchema = z.object({
  id: z.string().min(1),
});

const ApiStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

function normalizeDbStatus(
  raw: string,
): "pending" | "running" | "completed" | "failed" {
  const parsed = ApiStatusSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return "pending";
}

export async function GET(req: Request) {
  const session = await getCachedAuthSession();

  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const betterAuthOrganizationId = session.session.activeOrganizationId;
  if (!betterAuthOrganizationId) {
    return NextResponse.json(
      { error: "No active organization selected" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const queryParsed = QuerySchema.safeParse({
    id: url.searchParams.get("id"),
  });
  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: queryParsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id: analysisId } = queryParsed.data;

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.betterAuthOrganizationId, betterAuthOrganizationId),
  });

  if (!orgRow) {
    return NextResponse.json(
      { error: "Organization is not linked to this workspace" },
      { status: 400 },
    );
  }

  const row = await db.query.analyses.findFirst({
    where: and(
      eq(analyses.id, analysisId),
      eq(analyses.organizationId, orgRow.id),
    ),
    columns: {
      status: true,
      errorMessage: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const status = normalizeDbStatus(row.status);
  const payload: {
    status: typeof status;
    errorMessage?: string;
  } = { status };

  if (status === "failed" && row.errorMessage) {
    payload.errorMessage = row.errorMessage;
  }

  return NextResponse.json(payload);
}
