import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";
import { scrubSentryEvent } from "@/lib/sentry/scrub-sentry-event";

Sentry.init({
  dsn: env.sentry.dsn,
  enabled: Boolean(env.sentry.dsn),
  environment: env.nodeEnv,
  sendDefaultPii: false,
  tracesSampleRate: env.nodeEnv === "production" ? 0.1 : 0,
  beforeSend: (event, hint) => {
    void hint;
    return scrubSentryEvent(event);
  },
});
