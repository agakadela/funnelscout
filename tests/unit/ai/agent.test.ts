import { beforeEach, describe, expect, it, vi } from "vitest";

const costLogRows: Record<string, unknown>[] = [];
const analysisUpdates: Record<string, unknown>[] = [];
let selectLimitResult: { id: string }[] = [{ id: "analysis-1" }];

const { messagesCreate } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = {
      create: (...args: unknown[]) => messagesCreate(...args),
    };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => selectLimitResult),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((row: Record<string, unknown>) => {
        costLogRows.push(row);
        return Promise.resolve();
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          analysisUpdates.push(payload);
        }),
      })),
    })),
  },
}));

import {
  parseJsonFromModelText,
  runMultiStepAnalysisAgent,
} from "@/lib/ai/agent";

const metricsPayload = {
  headline: "Week",
  periodDescription: "P1",
  kpis: [{ label: "A", value: "1" }],
  summary: "S",
};

const anomaliesPayload = {
  anomalies: [
    {
      id: "x1",
      severity: "low" as const,
      title: "Minor",
      description: "Note",
    },
  ],
};

const recommendationsPayload = {
  recommendations: [
    {
      title: "Do this",
      body: "Because revenue",
      impact: "$5k/mo",
    },
  ],
};

function assistantMessage(text: string, input: number, output: number) {
  return {
    id: "msg_1",
    type: "message" as const,
    role: "assistant" as const,
    model: "claude-sonnet-4-6-20260218",
    content: [{ type: "text" as const, text, citations: null }],
    stop_reason: "end_turn" as const,
    stop_sequence: null,
    usage: { input_tokens: input, output_tokens: output },
  };
}

describe("parseJsonFromModelText", () => {
  it("parses raw JSON object string", () => {
    const out = parseJsonFromModelText('{"a":1}');
    expect(out).toEqual({ a: 1 });
  });

  it("strips a single markdown json fence when present", () => {
    const out = parseJsonFromModelText('```json\n{"b":2}\n```');
    expect(out).toEqual({ b: 2 });
  });
});

describe("runMultiStepAnalysisAgent", () => {
  beforeEach(() => {
    costLogRows.length = 0;
    analysisUpdates.length = 0;
    selectLimitResult = [{ id: "analysis-1" }];
    messagesCreate.mockReset();
  });

  it("runs all steps, logs three cost rows, and completes with merged report", async () => {
    messagesCreate
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify(metricsPayload), 100, 40),
      )
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify(anomaliesPayload), 80, 30),
      )
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify(recommendationsPayload), 90, 35),
      );

    await runMultiStepAnalysisAgent({
      organizationId: "org-1",
      analysisId: "analysis-1",
      triggeredBy: "manual",
      metricsSnapshot: { conversionRate: 0.12 },
    });

    expect(messagesCreate).toHaveBeenCalledTimes(3);
    expect(costLogRows).toHaveLength(3);
    expect(costLogRows.map((r) => r.step)).toEqual([
      "metrics",
      "anomaly",
      "recommendations",
    ]);
    expect(costLogRows[0]).toMatchObject({
      analysisId: "analysis-1",
      model: "claude-sonnet-4-6-20260218",
      inputTokens: 100,
      outputTokens: 40,
      triggeredBy: "manual",
    });
    expect(costLogRows[0].costUsd).toBe("0.000900");

    const completed = analysisUpdates.find((u) => u.status === "completed") as
      | { reportJson?: Record<string, unknown> }
      | undefined;
    expect(completed).toBeDefined();
    expect(completed?.reportJson?.metrics).toEqual(metricsPayload);
    expect(completed?.reportJson?.anomalies).toEqual(anomaliesPayload);
    expect(completed?.reportJson?.recommendations).toEqual(
      recommendationsPayload,
    );
  });

  it("marks failed when step 1 returns invalid JSON after logging cost", async () => {
    messagesCreate.mockResolvedValueOnce(assistantMessage("not json", 10, 5));

    await runMultiStepAnalysisAgent({
      organizationId: "org-1",
      analysisId: "analysis-1",
      triggeredBy: "scheduled",
      metricsSnapshot: {},
    });

    expect(costLogRows).toHaveLength(1);
    const failed = analysisUpdates.find((u) => u.status === "failed");
    expect(failed).toMatchObject({
      status: "failed",
      errorMessage: "Step metrics: invalid JSON from model",
    });
  });

  it("marks failed when Zod rejects step 2 output", async () => {
    messagesCreate
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify(metricsPayload), 10, 5),
      )
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify({ anomalies: "bad" }), 10, 5),
      );

    await runMultiStepAnalysisAgent({
      organizationId: "org-1",
      analysisId: "analysis-1",
      triggeredBy: "manual",
      metricsSnapshot: {},
    });

    expect(costLogRows).toHaveLength(2);
    const failed = analysisUpdates.find((u) => u.status === "failed");
    expect(failed?.errorMessage).toMatch(
      /Step anomaly: schema validation failed/,
    );
  });

  it("marks failed when recommendations step omits required impact", async () => {
    messagesCreate
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify(metricsPayload), 10, 5),
      )
      .mockResolvedValueOnce(
        assistantMessage(JSON.stringify(anomaliesPayload), 10, 5),
      )
      .mockResolvedValueOnce(
        assistantMessage(
          JSON.stringify({
            recommendations: [{ title: "T", body: "B", impact: "" }],
          }),
          10,
          5,
        ),
      );

    await runMultiStepAnalysisAgent({
      organizationId: "org-1",
      analysisId: "analysis-1",
      triggeredBy: "manual",
      metricsSnapshot: {},
    });

    expect(costLogRows).toHaveLength(3);
    const failed = analysisUpdates.find((u) => u.status === "failed");
    expect(failed?.errorMessage).toMatch(
      /Step recommendations: schema validation failed/,
    );
  });

  it("marks failed when analysis is not in organization", async () => {
    selectLimitResult = [];
    messagesCreate.mockResolvedValue(
      assistantMessage(JSON.stringify(metricsPayload), 1, 1),
    );

    await runMultiStepAnalysisAgent({
      organizationId: "org-1",
      analysisId: "missing",
      triggeredBy: "manual",
      metricsSnapshot: {},
    });

    expect(messagesCreate).not.toHaveBeenCalled();
    expect(costLogRows).toHaveLength(0);
    const failed = analysisUpdates.find((u) => u.status === "failed");
    expect(failed?.errorMessage).toBe("Analysis not found for organization");
  });
});
