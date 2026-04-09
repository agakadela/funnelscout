import { z } from "zod";

const envSchema = z.object({
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
  GHL_TOKEN_ENCRYPTION_KEY: z.string().length(64),
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
} as const;
