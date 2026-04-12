export type PipelineStageRow = {
  stageId: string;
  label: string;
  count: number;
  stalled: boolean;
};

export function pickStalledStageId(
  eventsByStageId: Record<string, number>,
): string | null {
  const entries = Object.entries(eventsByStageId).filter(([, n]) => n > 0);
  if (entries.length < 2) {
    return null;
  }
  entries.sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];
  if (max <= 0) {
    return null;
  }
  for (let i = 1; i < entries.length; i++) {
    const [, count] = entries[i];
    if (count < max * 0.35) {
      return entries[i][0];
    }
  }
  return null;
}

export function pipelineRowsFromEventsByStage(
  eventsByStageId: Record<string, number>,
): PipelineStageRow[] {
  const stalledId = pickStalledStageId(eventsByStageId);
  const entries = Object.entries(eventsByStageId)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  return entries.map(([stageId, count]) => ({
    stageId,
    label: formatStageLabel(stageId),
    count,
    stalled: stageId === stalledId,
  }));
}

export function formatStageLabel(stageId: string): string {
  if (stageId.length <= 14) {
    return stageId;
  }
  return `…${stageId.slice(-10)}`;
}
