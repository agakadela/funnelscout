import type { InngestFunction } from "inngest";
import { backfillOpportunities } from "@/inngest/functions/backfillOpportunities";
import { ingestWebhook } from "@/inngest/functions/ingestWebhook";
import { inngest } from "@/inngest/client";

export { inngest };

export const inngestFunctions: InngestFunction.Any[] = [
  ingestWebhook,
  backfillOpportunities,
];
