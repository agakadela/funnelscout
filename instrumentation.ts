import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

export async function register(): Promise<void> {
  if (env.nextRuntime === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
