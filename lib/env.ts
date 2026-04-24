import { z } from "zod";

import { nextPublicSentryDsnSchema } from "./env/next-public-sentry-dsn";

/**
 * Parses optional per-minute auth rate limits from env.
 * Empty / missing → `defaultPerMinute`. Invalid numbers → `defaultPerMinute`.
 * `0` disables that bucket (always allow).
 */
function parseAuthRateLimitOptional(
  raw: string | undefined,
  defaultPerMinute: number,
): number {
  if (raw === undefined || raw.trim() === "") return defaultPerMinute;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return defaultPerMinute;
  return n;
}

/** Resend `from:` — display name + angle-bracket email (e.g. FunnelScout <hello@funnelscout.ai>). */
function parseResendFromEmail(raw: string): string | null {
  const trimmed = raw.trim();
  const angle = trimmed.lastIndexOf(" <");
  if (angle < 1 || !trimmed.endsWith(">")) return null;
  const email = trimmed.slice(angle + 2, -1).trim();
  const emailOk = z.string().email().safeParse(email);
  return emailOk.success ? email : null;
}

function isValidResendFromHeader(raw: string): boolean {
  const trimmed = raw.trim();
  const angle = trimmed.lastIndexOf(" <");
  if (angle < 1 || !trimmed.endsWith(">")) return false;
  const display = trimmed.slice(0, angle).trim();
  return display.length > 0 && parseResendFromEmail(raw) !== null;
}

const envSchema = z
  .object({
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
    RESEND_FROM: z
      .string()
      .optional()
      .transform((s) => {
        if (s === undefined) return undefined;
        const t = s.trim();
        return t === "" ? undefined : t;
      }),
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
    GHL_WEBHOOK_RATE_LIMIT_PER_IP_PER_MINUTE: z
      .string()
      .optional()
      .transform((raw) => {
        if (raw === undefined || raw.trim() === "") return 0;
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      }),
    AUTH_RATE_LIMIT_SIGN_IN_PER_IP_PER_MINUTE: z
      .string()
      .optional()
      .transform((raw) => parseAuthRateLimitOptional(raw, 30)),
    AUTH_RATE_LIMIT_SIGN_UP_PER_IP_PER_MINUTE: z
      .string()
      .optional()
      .transform((raw) => parseAuthRateLimitOptional(raw, 12)),
    AUTH_RATE_LIMIT_PASSWORD_RESET_PER_IP_PER_MINUTE: z
      .string()
      .optional()
      .transform((raw) => parseAuthRateLimitOptional(raw, 8)),
    AUTH_RATE_LIMIT_SEND_VERIFICATION_EMAIL_PER_IP_PER_MINUTE: z
      .string()
      .optional()
      .transform((raw) => parseAuthRateLimitOptional(raw, 6)),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.NEXT_PUBLIC_SENTRY_DSN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "NEXT_PUBLIC_SENTRY_DSN is required in production (Sentry browser DSN URL).",
        path: ["NEXT_PUBLIC_SENTRY_DSN"],
      });
    }
    if (
      data.RESEND_FROM !== undefined &&
      !isValidResendFromHeader(data.RESEND_FROM)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "RESEND_FROM must look like: FunnelScout <hello@example.com> (display name, space, email in angle brackets).",
        path: ["RESEND_FROM"],
      });
    }
    if (data.NODE_ENV === "production") {
      if (data.RESEND_FROM === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "RESEND_FROM is required in production — use a domain verified in Resend (not onboarding@resend.dev).",
          path: ["RESEND_FROM"],
        });
      } else {
        const email = parseResendFromEmail(data.RESEND_FROM);
        if (email && email.toLowerCase().endsWith("@resend.dev")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "RESEND_FROM must use your verified sending domain in production, not @resend.dev.",
            path: ["RESEND_FROM"],
          });
        }
      }
    }
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
    webhookRateLimitPerIpPerMinute:
      _env.GHL_WEBHOOK_RATE_LIMIT_PER_IP_PER_MINUTE,
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
    from: _env.RESEND_FROM,
  },
  inngest: {
    eventKey: _env.INNGEST_EVENT_KEY,
    signingKey: _env.INNGEST_SIGNING_KEY,
  },
  auth: {
    secret: _env.BETTER_AUTH_SECRET,
    url: _env.BETTER_AUTH_URL,
    rateLimit: {
      signInPerIpPerMinute: _env.AUTH_RATE_LIMIT_SIGN_IN_PER_IP_PER_MINUTE,
      signUpPerIpPerMinute: _env.AUTH_RATE_LIMIT_SIGN_UP_PER_IP_PER_MINUTE,
      passwordResetPerIpPerMinute:
        _env.AUTH_RATE_LIMIT_PASSWORD_RESET_PER_IP_PER_MINUTE,
      sendVerificationEmailPerIpPerMinute:
        _env.AUTH_RATE_LIMIT_SEND_VERIFICATION_EMAIL_PER_IP_PER_MINUTE,
    },
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
