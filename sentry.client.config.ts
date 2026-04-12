import * as Sentry from "@sentry/nextjs";

import { readSentryBrowserDsn } from "@/lib/sentry/client-dsn";
import { scrubSentryEvent } from "@/lib/sentry/scrub-sentry-event";

const dsn = readSentryBrowserDsn();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: (event, hint) => {
    void hint;
    return scrubSentryEvent(event);
  },
});
