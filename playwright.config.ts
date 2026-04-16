import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

/** Must match `BETTER_AUTH_URL` origin (localhost vs 127.0.0.1 affects cookies). */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/visual",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  globalSetup: resolve(__dirname, "tests/visual/global-setup.ts"),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts$/,
      timeout: 180_000,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testMatch: /app-states\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
