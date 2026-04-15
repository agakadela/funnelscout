import { z } from "zod";

export const CLAUDE_SONNET_MODEL = "claude-sonnet-4-6" as const;

export const COST_LOG_STEPS = [
  "metrics",
  "anomaly",
  "recommendations",
] as const;
export type CostLogStep = (typeof COST_LOG_STEPS)[number];

export const MetricsSummarySchema = z.object({
  headline: z.string().min(1),
  periodDescription: z.string().min(1),
  kpis: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        trend: z.enum(["up", "down", "flat"]).optional(),
      }),
    )
    .min(1),
  summary: z.string().min(1),
});

export type MetricsSummary = z.infer<typeof MetricsSummarySchema>;

export const AnomalyListSchema = z.object({
  anomalies: z.array(
    z.object({
      id: z.string().min(1),
      severity: z.enum(["low", "medium", "high"]),
      title: z.string().min(1),
      description: z.string().min(1),
      affectedStage: z.string().optional(),
    }),
  ),
});

export type AnomalyList = z.infer<typeof AnomalyListSchema>;

export const RecommendationsOutputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        impact: z.string().min(1),
      }),
    )
    .min(1),
});

export type RecommendationsOutput = z.infer<typeof RecommendationsOutputSchema>;

export const AnalysisReportSchema = z.object({
  metrics: MetricsSummarySchema,
  anomalies: AnomalyListSchema,
  recommendations: RecommendationsOutputSchema,
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
