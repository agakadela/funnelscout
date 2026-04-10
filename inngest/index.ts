import type { InngestFunction } from "inngest";
import { analyzeAccount } from "@/inngest/functions/analyzeAccount";
import { backfillOpportunities } from "@/inngest/functions/backfillOpportunities";
import { ingestWebhook } from "@/inngest/functions/ingestWebhook";
import { weeklyAnalysis } from "@/inngest/functions/weeklyAnalysis";
import { inngest } from "@/inngest/client";

export { inngest };

export const inngestFunctions: InngestFunction.Any[] = [
  ingestWebhook,
  backfillOpportunities,
  analyzeAccount,
  weeklyAnalysis,
];
