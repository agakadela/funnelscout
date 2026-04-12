import {
  buildWeeklyAnalysisOutgoingEvents,
  listWeeklyAnalysisSubAccountTargets,
  type WeeklyAnalysisOutgoingEvent,
  type WeeklyAnalysisSubAccountRow,
} from "@/lib/analysis/weekly-analysis-fanout";
import { inngest } from "@/inngest/client";

/**
 * Monday 17:00 UTC — approximately 09:00 Pacific (standard) or 10:00 Pacific (daylight saving).
 */
const WEEKLY_CRON_UTC = "0 17 * * 1";

export type WeeklyAnalysisStepApi = {
  run: (id: string, fn: () => unknown) => Promise<unknown>;
  sendEvent: (
    stepId: string,
    events: WeeklyAnalysisOutgoingEvent[],
  ) => Promise<unknown>;
};

export async function runWeeklyAnalysisJob(
  step: WeeklyAnalysisStepApi,
): Promise<{ ok: true; sent: number }> {
  const subRows = (await step.run(
    "list-active-sub-accounts",
    listWeeklyAnalysisSubAccountTargets,
  )) as WeeklyAnalysisSubAccountRow[];

  const toSend = (await step.run("prepare-analysis-jobs", () =>
    buildWeeklyAnalysisOutgoingEvents(subRows),
  )) as WeeklyAnalysisOutgoingEvent[];

  if (toSend.length === 0) {
    return { ok: true as const, sent: 0 };
  }

  await step.sendEvent("emit-account-analysis-requests", toSend);

  return { ok: true as const, sent: toSend.length };
}

export const weeklyAnalysis = inngest.createFunction(
  {
    id: "weekly-analysis",
    name: "Weekly analysis fan-out",
  },
  { cron: WEEKLY_CRON_UTC },
  async ({ step }) => runWeeklyAnalysisJob(step),
);
