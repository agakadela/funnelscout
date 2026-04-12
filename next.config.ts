import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import { env } from "./lib/env";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: env.sentry.org,
  project: env.sentry.project,
  authToken: env.sentry.authToken,
  widenClientFileUpload: true,
});
