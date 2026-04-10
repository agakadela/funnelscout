import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";

import {
  AnomalyListSchema,
  type AnalysisReport,
  CLAUDE_SONNET_MODEL,
  type CostLogStep,
  MetricsSummarySchema,
  RecommendationsOutputSchema,
} from "@/lib/ai/types";
import { calculateCost, formatCostUsd } from "@/lib/ai/cost";
import {
  anomalyStepSystemPrompt,
  metricsStepSystemPrompt,
  recommendationsStepSystemPrompt,
} from "@/lib/ai/prompts";
import { analyses, costLogs } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const MAX_TOKENS_PER_STEP = 4096;

export type AnalysisTriggerSource = "scheduled" | "manual";

export type RunMultiStepAnalysisAgentInput = {
  organizationId: string;
  analysisId: string;
  triggeredBy: AnalysisTriggerSource;
  metricsSnapshot: unknown;
};

function joinAssistantText(content: Anthropic.ContentBlock[]): string {
  const parts = content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text);
  if (parts.length === 0) {
    throw new Error("Model response contained no text blocks");
  }
  return parts.join("\n");
}

export function parseJsonFromModelText(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText) as unknown;
}

async function requireAnalysisForOrganization(
  analysisId: string,
  organizationId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: analyses.id })
    .from(analyses)
    .where(
      and(
        eq(analyses.id, analysisId),
        eq(analyses.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error("Analysis not found for organization");
  }
}

async function insertCostLogRow(input: {
  analysisId: string;
  step: CostLogStep;
  model: string;
  inputTokens: number;
  outputTokens: number;
  triggeredBy: AnalysisTriggerSource;
}): Promise<void> {
  const costUsd = calculateCost(
    input.model,
    input.inputTokens,
    input.outputTokens,
  );

  await db.insert(costLogs).values({
    analysisId: input.analysisId,
    model: input.model,
    step: input.step,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costUsd: formatCostUsd(costUsd),
    triggeredBy: input.triggeredBy,
  });
}

async function markAnalysisFailed(
  organizationId: string,
  analysisId: string,
  errorMessage: string,
): Promise<void> {
  await db
    .update(analyses)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(analyses.id, analysisId),
        eq(analyses.organizationId, organizationId),
      ),
    );
}

async function markAnalysisRunning(
  organizationId: string,
  analysisId: string,
): Promise<void> {
  await db
    .update(analyses)
    .set({
      status: "running",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(analyses.id, analysisId),
        eq(analyses.organizationId, organizationId),
      ),
    );
}

async function markAnalysisCompleted(
  organizationId: string,
  analysisId: string,
  report: AnalysisReport,
): Promise<void> {
  await db
    .update(analyses)
    .set({
      status: "completed",
      reportJson: report,
      errorMessage: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(analyses.id, analysisId),
        eq(analyses.organizationId, organizationId),
      ),
    );
}

async function callClaudeJsonStep(
  client: Anthropic,
  input: { system: string; userText: string },
): Promise<Anthropic.Message> {
  return client.messages.create({
    model: CLAUDE_SONNET_MODEL,
    max_tokens: MAX_TOKENS_PER_STEP,
    system: input.system,
    messages: [{ role: "user", content: input.userText }],
  });
}

/**
 * Runs the three-step Claude pipeline: metrics summary → anomalies → recommendations.
 * After each API call, inserts `cost_logs` (required for every Claude call), then validates JSON with Zod.
 * Updates `analyses` status and `reportJson` / `errorMessage` accordingly.
 */
export async function runMultiStepAnalysisAgent(
  input: RunMultiStepAnalysisAgentInput,
): Promise<void> {
  const { organizationId, analysisId, triggeredBy, metricsSnapshot } = input;

  const metricsJson = JSON.stringify(metricsSnapshot);

  try {
    await requireAnalysisForOrganization(analysisId, organizationId);
    await markAnalysisRunning(organizationId, analysisId);

    const anthropic = new Anthropic({ apiKey: env.anthropic.apiKey });

    const msg1 = await callClaudeJsonStep(anthropic, {
      system: metricsStepSystemPrompt,
      userText: `Pipeline metrics snapshot (JSON):\n${metricsJson}`,
    });
    await insertCostLogRow({
      analysisId,
      step: "metrics",
      model: CLAUDE_SONNET_MODEL,
      inputTokens: msg1.usage.input_tokens,
      outputTokens: msg1.usage.output_tokens,
      triggeredBy,
    });
    let parsed1: unknown;
    try {
      parsed1 = parseJsonFromModelText(joinAssistantText(msg1.content));
    } catch {
      await markAnalysisFailed(
        organizationId,
        analysisId,
        "Step metrics: invalid JSON from model",
      );
      return;
    }
    const metricsResult = MetricsSummarySchema.safeParse(parsed1);
    if (!metricsResult.success) {
      await markAnalysisFailed(
        organizationId,
        analysisId,
        `Step metrics: schema validation failed — ${metricsResult.error.message}`,
      );
      return;
    }
    const metricsSummary = metricsResult.data;
    const metricsSummaryJson = JSON.stringify(metricsSummary);

    const msg2 = await callClaudeJsonStep(anthropic, {
      system: anomalyStepSystemPrompt,
      userText: `Pipeline metrics snapshot (JSON):\n${metricsJson}\n\nMetrics summary from step 1 (JSON):\n${metricsSummaryJson}`,
    });
    await insertCostLogRow({
      analysisId,
      step: "anomaly",
      model: CLAUDE_SONNET_MODEL,
      inputTokens: msg2.usage.input_tokens,
      outputTokens: msg2.usage.output_tokens,
      triggeredBy,
    });
    let parsed2: unknown;
    try {
      parsed2 = parseJsonFromModelText(joinAssistantText(msg2.content));
    } catch {
      await markAnalysisFailed(
        organizationId,
        analysisId,
        "Step anomaly: invalid JSON from model",
      );
      return;
    }
    const anomalyResult = AnomalyListSchema.safeParse(parsed2);
    if (!anomalyResult.success) {
      await markAnalysisFailed(
        organizationId,
        analysisId,
        `Step anomaly: schema validation failed — ${anomalyResult.error.message}`,
      );
      return;
    }
    const anomalies = anomalyResult.data;
    const anomaliesJson = JSON.stringify(anomalies);

    const msg3 = await callClaudeJsonStep(anthropic, {
      system: recommendationsStepSystemPrompt,
      userText: `Pipeline metrics snapshot (JSON):\n${metricsJson}\n\nMetrics summary (JSON):\n${metricsSummaryJson}\n\nAnomalies (JSON):\n${anomaliesJson}`,
    });
    await insertCostLogRow({
      analysisId,
      step: "recommendations",
      model: CLAUDE_SONNET_MODEL,
      inputTokens: msg3.usage.input_tokens,
      outputTokens: msg3.usage.output_tokens,
      triggeredBy,
    });
    let parsed3: unknown;
    try {
      parsed3 = parseJsonFromModelText(joinAssistantText(msg3.content));
    } catch {
      await markAnalysisFailed(
        organizationId,
        analysisId,
        "Step recommendations: invalid JSON from model",
      );
      return;
    }
    const recResult = RecommendationsOutputSchema.safeParse(parsed3);
    if (!recResult.success) {
      await markAnalysisFailed(
        organizationId,
        analysisId,
        `Step recommendations: schema validation failed — ${recResult.error.message}`,
      );
      return;
    }
    const recommendations = recResult.data;

    const report: AnalysisReport = {
      metrics: metricsSummary,
      anomalies,
      recommendations,
    };

    await markAnalysisCompleted(organizationId, analysisId, report);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error during analysis agent";
    await markAnalysisFailed(organizationId, analysisId, message);
  }
}
