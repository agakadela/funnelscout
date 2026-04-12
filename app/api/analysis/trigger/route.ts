import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getCachedAuthSession } from "@/lib/auth-session";
import { prepareAccountAnalysis } from "@/lib/analysis/enqueue";
import { organizations, subAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";

const TriggerBodySchema = z.object({
  subAccountId: z.string().min(1),
});

export async function POST(req: Request) {
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

  const json: unknown = await req.json().catch(() => null);
  const bodyParsed = TriggerBodySchema.safeParse(json);
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: bodyParsed.error.flatten() },
      { status: 400 },
    );
  }
  const { subAccountId } = bodyParsed.data;

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.betterAuthOrganizationId, betterAuthOrganizationId),
  });

  if (!orgRow) {
    return NextResponse.json(
      { error: "Organization is not linked to this workspace" },
      { status: 400 },
    );
  }

  const subRow = await db.query.subAccounts.findFirst({
    where: and(
      eq(subAccounts.id, subAccountId),
      eq(subAccounts.organizationId, orgRow.id),
    ),
  });

  if (!subRow) {
    return NextResponse.json(
      { error: "Sub-account not found" },
      { status: 404 },
    );
  }

  const prepared = await prepareAccountAnalysis({
    organizationId: orgRow.id,
    subAccountId,
    triggeredBy: "manual",
  });

  if (prepared.outcome === "blocked_plan") {
    return NextResponse.json(
      {
        error: "Plan or subscription blocks analysis",
        reason: prepared.plan.reason,
      },
      { status: 403 },
    );
  }

  if (prepared.outcome === "done_already") {
    return NextResponse.json({ analysisId: prepared.analysisId });
  }

  await inngest.send({
    id: prepared.idempotencyId,
    name: "analysis/account.requested",
    data: prepared.eventPayload,
  });

  return NextResponse.json({ analysisId: prepared.analysisId });
}
