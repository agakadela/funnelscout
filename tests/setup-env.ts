import { z } from "zod";

const testEnv = z.object({
  NODE_ENV: z.literal("test"),
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
  GHL_TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64)
    .refine((key) => !/^0{64}$/.test(key)),
});

const values = {
  NODE_ENV: "test" as const,
  GHL_CLIENT_ID: "test_ghl_client_id",
  GHL_CLIENT_SECRET: "test_ghl_client_secret",
  GHL_WEBHOOK_SECRET: "test_ghl_webhook_secret",
  GHL_REDIRECT_URI: "http://localhost:3000/api/ghl/oauth/callback",
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_test_placeholder",
  ANTHROPIC_API_KEY: "sk-ant-test-placeholder",
  RESEND_API_KEY: "re_test_placeholder",
  INNGEST_EVENT_KEY: "test_inngest_event_key",
  INNGEST_SIGNING_KEY: "test_inngest_signing_key",
  BETTER_AUTH_SECRET: "test_better_auth_secret_must_be_long_enough_32",
  BETTER_AUTH_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
  GHL_TOKEN_ENCRYPTION_KEY:
    "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
};

for (const [key, value] of Object.entries(values)) {
  process.env[key] = value;
}

testEnv.parse(process.env);
