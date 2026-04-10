/**
 * Returns the most recently completed Monday→Monday UTC window (half-open).
 * Used as the canonical analysis period and idempotency anchor for a weekly run.
 */
export function getCompletedUtcWeekRange(reference: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const d = reference.getUTCDate();
  const noonUtc = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const day = noonUtc.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const thisMondayUtc = new Date(noonUtc);
  thisMondayUtc.setUTCDate(noonUtc.getUTCDate() - daysFromMonday);
  thisMondayUtc.setUTCHours(0, 0, 0, 0);

  const periodEnd = new Date(thisMondayUtc);
  const periodStart = new Date(thisMondayUtc);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);

  return { periodStart, periodEnd };
}

export function analysisIdempotencyId(
  subAccountId: string,
  periodStart: Date,
): string {
  return `analysis-${subAccountId}-${periodStart.toISOString()}`;
}
