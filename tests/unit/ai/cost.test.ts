import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: hoisted.captureException,
}));

import { calculateCost } from "@/lib/ai/cost";
import { AnalysisReportSchema, CLAUDE_SONNET_MODEL } from "@/lib/ai/types";

describe("calculateCost", () => {
  beforeEach(() => {
    hoisted.captureException.mockReset();
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost(CLAUDE_SONNET_MODEL, 0, 0)).toBe(0);
  });

  it("charges $3 per million input tokens", () => {
    expect(calculateCost(CLAUDE_SONNET_MODEL, 1_000_000, 0)).toBe(3);
  });

  it("charges $15 per million output tokens", () => {
    expect(calculateCost(CLAUDE_SONNET_MODEL, 0, 1_000_000)).toBe(15);
  });

  it("combines input and output using exact pricing", () => {
    expect(calculateCost(CLAUDE_SONNET_MODEL, 1_000_000, 1_000_000)).toBe(18);
  });

  it("handles small token counts without floating point drift", () => {
    expect(calculateCost(CLAUDE_SONNET_MODEL, 1, 1)).toBe(0.000018);
    expect(calculateCost(CLAUDE_SONNET_MODEL, 1000, 500)).toBe(0.0105);
  });

  it("uses Sonnet 4.6 pricing as fallback for unknown models and reports to Sentry", () => {
    expect(calculateCost("other-model", 1_000_000, 0)).toBe(3);
    expect(hoisted.captureException).toHaveBeenCalledTimes(1);
    const err = hoisted.captureException.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Unsupported model");
  });

  it("rejects negative token counts", () => {
    expect(() => calculateCost(CLAUDE_SONNET_MODEL, -1, 0)).toThrow(
      "non-negative",
    );
  });

  it("rejects non-integer token counts", () => {
    expect(() => calculateCost(CLAUDE_SONNET_MODEL, 1.5, 0)).toThrow(
      "integers",
    );
  });
});

describe("AnalysisReportSchema", () => {
  const validReport = {
    metrics: {
      headline: "Week in review",
      periodDescription: "Mar 1–7",
      kpis: [{ label: "Win rate", value: "32%" }],
      summary: "Solid week overall.",
    },
    anomalies: {
      anomalies: [
        {
          id: "a1",
          severity: "high" as const,
          title: "Drop in qualified leads",
          description: "QoQ decline in stage 2.",
        },
      ],
    },
    recommendations: {
      recommendations: [
        {
          title: "Fix follow-up SLA",
          body: "Reduce time-to-first-touch under 2h.",
          impact: "$2.4k/mo",
        },
      ],
    },
  };

  it("accepts a complete report with required recommendation impact", () => {
    const parsed = AnalysisReportSchema.safeParse(validReport);
    expect(parsed.success).toBe(true);
  });

  it("rejects recommendations missing impact", () => {
    const parsed = AnalysisReportSchema.safeParse({
      ...validReport,
      recommendations: {
        recommendations: [{ title: "T", body: "B", impact: "" }],
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty recommendations list", () => {
    const parsed = AnalysisReportSchema.safeParse({
      ...validReport,
      recommendations: { recommendations: [] },
    });
    expect(parsed.success).toBe(false);
  });
});
