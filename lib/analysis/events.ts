import { z } from "zod";

export const AnalysisTriggerSourceSchema = z.enum(["scheduled", "manual"]);

export const AnalysisAccountRequestedDataSchema = z.object({
  analysisId: z.string().min(1),
  organizationId: z.string().min(1),
  subAccountId: z.string().min(1),
  triggeredBy: AnalysisTriggerSourceSchema,
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export type AnalysisAccountRequestedData = z.infer<
  typeof AnalysisAccountRequestedDataSchema
>;
