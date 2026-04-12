import { describe, expect, it } from "vitest";

import {
  pickStalledStageId,
  pipelineRowsFromEventsByStage,
} from "@/lib/dashboard/pipeline-stages";

describe("pickStalledStageId", () => {
  it("returns null when there are fewer than two stages", () => {
    expect(pickStalledStageId({ a: 10 })).toBeNull();
  });

  it("returns a stage that is materially smaller than the top stage", () => {
    const id = pickStalledStageId({
      stage_top: 100,
      stage_mid: 40,
      stage_low: 5,
    });
    expect(id).toBe("stage_low");
  });
});

describe("pipelineRowsFromEventsByStage", () => {
  it("sorts rows by count descending and marks stalled stage", () => {
    const rows = pipelineRowsFromEventsByStage({
      s1: 50,
      s2: 10,
      s3: 2,
    });
    expect(rows[0].count).toBe(50);
    expect(rows.some((r) => r.stalled)).toBe(true);
  });
});
