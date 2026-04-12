import { z } from "zod";

/** Shared with `lib/env.ts` — same validation on server and in the browser bundle. */
export const nextPublicSentryDsnSchema = z.string().url().optional();

export function readNextPublicSentryDsnFromProcess(): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  const parsed = nextPublicSentryDsnSchema.safeParse(
    process.env.NEXT_PUBLIC_SENTRY_DSN,
  );
  return parsed.success ? parsed.data : undefined;
}
