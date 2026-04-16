import { Suspense } from "react";

import { AnalysisHistoryContent } from "@/components/dashboard/AnalysisHistoryContent";
import { AnalysisHistorySkeleton } from "@/components/dashboard/AnalysisHistorySkeleton";

type AnalysisHistoryPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parseAnalysisHistoryPage(raw: string | undefined): number {
  if (raw === undefined || raw === "") {
    return 1;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

export default async function AnalysisHistoryPage({
  searchParams,
}: AnalysisHistoryPageProps) {
  const sp = await searchParams;
  const page = parseAnalysisHistoryPage(sp.page);

  return (
    <Suspense fallback={<AnalysisHistorySkeleton />}>
      <AnalysisHistoryContent page={page} />
    </Suspense>
  );
}
