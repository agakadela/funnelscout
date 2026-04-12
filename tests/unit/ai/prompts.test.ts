import { describe, expect, it } from "vitest";
import {
  anomalyStepSystemPrompt,
  metricsStepSystemPrompt,
  recommendationsStepSystemPrompt,
} from "@/lib/ai/prompts";

describe("lib/ai/prompts", () => {
  it("exports non-empty system prompts for each analysis pipeline step", () => {
    expect(metricsStepSystemPrompt.length).toBeGreaterThan(50);
    expect(anomalyStepSystemPrompt.length).toBeGreaterThan(50);
    expect(recommendationsStepSystemPrompt.length).toBeGreaterThan(50);
  });

  it("metrics step requires JSON-only output and a concrete headline/KPI shape", () => {
    expect(metricsStepSystemPrompt).toContain("single JSON object only");
    expect(metricsStepSystemPrompt).toContain('"headline"');
    expect(metricsStepSystemPrompt).toContain('"kpis"');
    expect(metricsStepSystemPrompt).toContain("GoHighLevel");
  });

  it("anomaly step requires JSON-only output and an anomalies array shape", () => {
    expect(anomalyStepSystemPrompt).toContain("single JSON object only");
    expect(anomalyStepSystemPrompt).toContain('"anomalies"');
    expect(anomalyStepSystemPrompt).toContain('"severity"');
  });

  it("recommendations step requires JSON-only output and recommendation fields", () => {
    expect(recommendationsStepSystemPrompt).toContain(
      "single JSON object only",
    );
    expect(recommendationsStepSystemPrompt).toContain('"recommendations"');
    expect(recommendationsStepSystemPrompt).toContain('"impact"');
    expect(recommendationsStepSystemPrompt).toContain(
      "Include at least one recommendation",
    );
  });
});
