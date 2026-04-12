export function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0";
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}m`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatPercentRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) {
    return "—";
  }
  return `${Math.round(ratio * 100)}%`;
}
