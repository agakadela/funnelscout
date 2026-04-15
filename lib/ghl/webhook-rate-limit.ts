const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function resetGhlWebhookRateLimitBucketsForTests(): void {
  buckets.clear();
}

/** Test hook: bucket count after pruning stale client keys. */
export function getGhlWebhookRateLimitBucketKeyCountForTests(): number {
  return buckets.size;
}

function pruneBucketsOutsideWindow(nowMs: number): void {
  const windowStart = nowMs - WINDOW_MS;
  for (const [key, stamps] of buckets) {
    const fresh = stamps.filter((t) => t > windowStart);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else if (fresh.length !== stamps.length) {
      buckets.set(key, fresh);
    }
  }
}

export function tryConsumeGhlWebhookRateSlot(
  clientKey: string,
  maxPerMinute: number,
  nowMs: number = Date.now(),
): boolean {
  pruneBucketsOutsideWindow(nowMs);

  if (maxPerMinute <= 0) {
    return true;
  }

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
