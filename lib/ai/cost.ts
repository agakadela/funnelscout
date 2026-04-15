import * as Sentry from "@sentry/nextjs";

import { CLAUDE_SONNET_MODEL } from "@/lib/ai/types";

const INPUT_USD_PER_MILLION = 3;
const OUTPUT_USD_PER_MILLION = 15;

function computeSonnet46CostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  const numerator =
    BigInt(inputTokens) * BigInt(INPUT_USD_PER_MILLION) +
    BigInt(outputTokens) * BigInt(OUTPUT_USD_PER_MILLION);
  const denominator = BigInt(1_000_000);
  const microUsdRounded =
    (numerator * BigInt(1_000_000) + denominator / BigInt(2)) / denominator;

  return Number(microUsdRounded) / 1_000_000;
}

/**
 * Returns total USD for the given token counts using Claude Sonnet 4.6 list pricing
 * ($3 / M input, $15 / M output — see Anthropic models overview for `claude-sonnet-4-6`).
 * Uses bigint rationals to avoid float drift; use `formatCostUsd` for a 6-decimal DB string.
 * Unknown `model` values are billed with the same rates after `Sentry.captureException` so
 * analysis is not aborted when the API returns an unexpected model id.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!Number.isInteger(inputTokens) || !Number.isInteger(outputTokens)) {
    throw new Error("Token counts must be integers");
  }
  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error("Token counts must be non-negative");
  }
  if (inputTokens === 0 && outputTokens === 0) {
    return 0;
  }

  if (model !== CLAUDE_SONNET_MODEL) {
    Sentry.captureException(
      new Error(`Unsupported model for cost calculation: ${model}`),
    );
  }

  return computeSonnet46CostUsd(inputTokens, outputTokens);
}

export function formatCostUsd(costUsd: number): string {
  return costUsd.toFixed(6);
}
