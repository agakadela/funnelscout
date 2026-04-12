import type { PipelineMetricsSnapshot } from "@/lib/analysis/metrics";

/**
 * Display-only health score (0–100) derived from pipeline snapshot until
 * product finalizes the weighted formula.
 */
export function healthScoreFromPipelineSnapshot(
  snapshot: PipelineMetricsSnapshot,
): number {
  const won = snapshot.statusCounts["won"] ?? 0;
  const lost = snapshot.statusCounts["lost"] ?? 0;
  const closed = won + lost;
  const conversion =
    closed === 0 ? 0.55 : Math.min(1, Math.max(0, won / closed));

  const oppCount = Math.max(0, snapshot.uniqueOpportunityCount);
  const volumeSignal = Math.min(1, oppCount / 40);

  const score = Math.round(34 + conversion * 46 + volumeSignal * 20);
  return Math.min(100, Math.max(0, score));
}

export function healthTier(score: number): "green" | "yellow" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

export function stalledDealCount(snapshot: PipelineMetricsSnapshot): number {
  const stalled = snapshot.statusCounts["stalled"];
  if (typeof stalled === "number" && stalled > 0) {
    return stalled;
  }
  return 0;
}
