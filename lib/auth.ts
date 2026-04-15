import * as Sentry from "@sentry/nextjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import * as authSchema from "@/drizzle/better-auth-schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/resend";

export const auth = betterAuth({
  appName: "FunnelScout",
  secret: env.auth.secret,
  baseURL: env.auth.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({
          to: user.email,
          resetUrl: url,
        });
      } catch (err) {
        Sentry.captureException(
          err instanceof Error
            ? err
            : new Error("Password reset email delivery failed"),
        );
        throw err;
      }
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async (params) => {
      const { user, url } = params;
      try {
        await sendVerificationEmail({
          to: user.email,
          verifyUrl: url,
        });
      } catch (err) {
        Sentry.captureException(
          err instanceof Error
            ? err
            : new Error("Verification email delivery failed"),
        );
        throw err;
      }
    },
  },
  plugins: [
    nextCookies(),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
  ],
});
