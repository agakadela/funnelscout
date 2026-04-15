import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { env } from "./lib/env";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' https://js.stripe.com",
      "frame-src https://js.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.sentry.io wss://*.sentry.io",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: env.sentry.org,
  project: env.sentry.project,
  authToken: env.sentry.authToken,
  widenClientFileUpload: true,
});
