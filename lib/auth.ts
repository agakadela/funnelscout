import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import * as authSchema from "@/drizzle/better-auth-schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

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
  },
  plugins: [
    nextCookies(),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
  ],
});
