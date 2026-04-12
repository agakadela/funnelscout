import { z } from "zod";

import { nextPublicSentryDsnSchema } from "./env/next-public-sentry-dsn";

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (val: unknown) => {
      if (val === "production") return "production";
      if (val === "test") return "test";
      return "development";
    },
    z.enum(["development", "production", "test"]),
  ),
  GHL_CLIENT_ID: z.string().min(1),
  GHL_CLIENT_SECRET: z.string().min(1),
  GHL_WEBHOOK_SECRET: z.string().min(1),
  GHL_REDIRECT_URI: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
  NEXT_PUBLIC_SENTRY_DSN: nextPublicSentryDsnSchema,
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  GHL_TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64)
    .refine((key) => !/^0{64}$/.test(key), {
      message:
        "GHL_TOKEN_ENCRYPTION_KEY must not be all zeros — use: openssl rand -hex 32",
    }),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Missing or invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment configuration — check logs above");
}

const _env = parsed.data;

export const env = {
  nodeEnv: _env.NODE_ENV,
  nextRuntime: _env.NEXT_RUNTIME,
  ghl: {
    clientId: _env.GHL_CLIENT_ID,
    clientSecret: _env.GHL_CLIENT_SECRET,
    webhookSecret: _env.GHL_WEBHOOK_SECRET,
    redirectUri: _env.GHL_REDIRECT_URI,
    tokenEncryptKey: _env.GHL_TOKEN_ENCRYPTION_KEY,
  },
  stripe: {
    secretKey: _env.STRIPE_SECRET_KEY,
    webhookSecret: _env.STRIPE_WEBHOOK_SECRET,
  },
  anthropic: {
    apiKey: _env.ANTHROPIC_API_KEY,
  },
  resend: {
    apiKey: _env.RESEND_API_KEY,
  },
  inngest: {
    eventKey: _env.INNGEST_EVENT_KEY,
    signingKey: _env.INNGEST_SIGNING_KEY,
  },
  auth: {
    secret: _env.BETTER_AUTH_SECRET,
    url: _env.BETTER_AUTH_URL,
  },
  database: {
    url: _env.DATABASE_URL,
  },
  sentry: {
    dsn: _env.NEXT_PUBLIC_SENTRY_DSN,
    org: _env.SENTRY_ORG,
    project: _env.SENTRY_PROJECT,
    authToken: _env.SENTRY_AUTH_TOKEN,
  },
} as const;
