const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function resetGhlWebhookRateLimitBucketsForTests(): void {
  buckets.clear();
}

export function tryConsumeGhlWebhookRateSlot(
  clientKey: string,
  maxPerMinute: number,
  nowMs: number = Date.now(),
): boolean {
  if (maxPerMinute <= 0) return true;

  const windowStart = nowMs - WINDOW_MS;
  const prior = buckets.get(clientKey) ?? [];
  const stamps = prior.filter((t) => t > windowStart);

  if (stamps.length >= maxPerMinute) {
    buckets.set(clientKey, stamps);
    return false;
  }

  stamps.push(nowMs);
  buckets.set(clientKey, stamps);
  return true;
}
