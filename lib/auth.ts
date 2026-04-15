import * as Sentry from "@sentry/nextjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import * as authSchema from "@/drizzle/better-auth-schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/resend";

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
  plugins: [
    nextCookies(),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
  ],
});
