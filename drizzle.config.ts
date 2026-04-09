import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — used by CLI only (`pnpm db:*`).
 * Credentials: `DATABASE_URL_DIRECT` (see docs/spec.md). Task 2 wires env validation.
 */
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? "",
  },
});
